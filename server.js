// https://medium.com/coinmonks/ethereum-tutorial-sending-transaction-via-nodejs-backend-7b623b885707
// https://gist.github.com/sulejirl/f5ccce2e77473044e46967bb3f6d83d3
// https://geth.ethereum.org/downloads/
// https://etherscan.io/tx/0x19f1bb0341b5c49d5c53b3ab987162c556c4899455e41b56ea59cb6adc6b1661
// https://ethereum.stackexchange.com/questions/2531/common-useful-javascript-snippets-for-geth/3478#3478
// https://github.com/ConsenSys/abi-decoder
// 1 ETH = 1000000000000000000 wei = 1000000000 gwei (shannon) = 1000000 szabo = 1000 finney

const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const bodyParser = require("body-parser");
const web3 = require('web3');
const abiDecoder = require('abi-decoder');
const abi = require('./abi.js');
const TransactionDTO = require('./TransactionDTO.js');

const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const getBlock = require('./services/getBlock');
const getLatestBlock = require('./services/getLatestBlock');
const getTransaction = require('./services/getTransaction');
const getTransactionReceipt = require('./services/getTransactionReceipt');
const getBalance = require('./services/getBalance');
const sendTransaction = require('./services/sendTransaction');

app.post('/getLatestBlock', async (req, res) => {
    try {
        let endBlock = (await getLatestBlock()).number;
        res.json(endBlock);
    } catch (e) {
        res.status(500).json(e.message);
    }
});

app.post('/getTransactions', async (req, res) => {
    try {
        const startBlock = parseInt(req.body.startBlock);
        const endBlock = parseInt(req.body.endBlock);

        const blocks = {};
        for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
            const block = await getBlock(blockNumber);
            if (block) {
                blocks[block.number] = [];
                const blockTransactions = block && block.transactions ? block.transactions : [];
                for (let txI = 0; txI < blockTransactions.length; txI++) {
                    const transaction = blockTransactions[txI];

                    let to = transaction.to;
                    let value = transaction.value;

                    const contractHash = to ? to.toLowerCase() === '0x0845b0058b8d41025c7a3466952864e872a4cd08'.toLowerCase() ? to.toLowerCase() : null : null;
                    const contractAbi = contractHash ? abi[contractHash.toLowerCase()] : null;

                    if (contractHash && contractAbi) {
                        const web3js = new web3(new web3.providers.HttpProvider(process.env.ETHEREUM_JSON_RPC_URL));
                        abiDecoder.addABI(contractAbi);
                        const decodedData = abiDecoder.decodeMethod(transaction.input);
                        abiDecoder.removeABI(contractAbi);
                        decodedData.params.map(param => {
                            if (decodedData.name === 'transfer')
                                if (param.name === '_to') {
                                    to = param.value;
                                }

                            if (param.name === '_value') {
                                value = param.value;
                            }
                        });
                    }

                    const transactionResult = new TransactionDTO(
                        transaction.blockNumber,
                        block.timestamp,
                        transaction.hash,
                        true,
                        contractHash,
                        transaction.from,
                        to,
                        transaction.gas,
                        transaction.gasPrice,
                        value
                    );
                    blocks[block.number].push(transactionResult);
                }
            }
        }

        res.json(blocks);
    } catch (e) {
        console.error(e);
        res.status(500).json(e.message);
    }
});

app.post('/getTransaction', async (req, res) => {
    try {
        const transaction = await getTransaction(req.body.hash);
        const transactionReceipt = await getTransactionReceipt(req.body.hash);

        const gas = transactionReceipt ? transactionReceipt.gasUsed : transaction.gas;
        const contractHash = transaction.to.toLowerCase() === '0x0845b0058b8d41025c7a3466952864e872a4cd08'.toLowerCase() ? transaction.to.toLowerCase() : null;
        const contractAbi = contractHash ? abi[contractHash.toLowerCase()] : null;
        let to = transaction.to;
        let value = transaction.value;
        let timestamp = null;

        if (contractHash && contractAbi) {
            const web3js = new web3(new web3.providers.HttpProvider(process.env.ETHEREUM_JSON_RPC_URL));
            abiDecoder.addABI(contractAbi);
            const decodedData = abiDecoder.decodeMethod(transaction.input);
            abiDecoder.removeABI(contractAbi);
            decodedData.params.map(param => {
                if (decodedData.name === 'transfer')
                    if (param.name === '_to') {
                        to = param.value;
                    }

                if (param.name === '_value') {
                    value = param.value;
                }
            });
        }

        if (transaction.blockNumber) {
            const block = await getBlock(transaction.blockNumber);
            timestamp = block.timestamp;
        }

        const transactionResult = new TransactionDTO(
            transaction.blockNumber,
            timestamp,
            transaction.hash,
            transactionReceipt ? transactionReceipt.status : null,
            contractHash,
            transaction.from,
            to,
            gas,
            transaction.gasPrice,
            value
        );

        res.json(transactionResult);
    } catch (e) {
        res.status(500).json(e.message);
    }
});

app.post('/getBalance', async (req, res) => {
    try {
        const balance = await getBalance(
            req.body.hash,
            req.body.contract
        );
        res.json(web3.utils.fromWei(balance));
    } catch (e) {
        res.status(500).json(e.message);
    }
});

app.post('/send', async (req, res) => {
    try {
        const transaction = await sendTransaction(
            req.body.from,
            req.body.private,
            req.body.to,
            req.body.value,
            req.body.contract
        );

        res.json(transaction);
    } catch (e) {
        res.status(500).json(e.message);
    }
});

app.listen(process.env.PORT, () => console.log('Started on port: ' + process.env.PORT));

// https://medium.com/coinmonks/ethereum-tutorial-sending-transaction-via-nodejs-backend-7b623b885707
// https://gist.github.com/sulejirl/f5ccce2e77473044e46967bb3f6d83d3
// https://geth.ethereum.org/downloads/
// https://etherscan.io/tx/0x19f1bb0341b5c49d5c53b3ab987162c556c4899455e41b56ea59cb6adc6b1661
// https://ethereum.stackexchange.com/questions/2531/common-useful-javascript-snippets-for-geth/3478#3478
// 1 ETH = 1000000000000000000 wei = 1000000000 gwei (shannon) = 1000000 szabo = 1000 finney

const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const bodyParser = require("body-parser");
const web3 = require('web3');
const Tx = require('ethereumjs-tx').Transaction;

const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const web3js = new web3(new web3.providers.HttpProvider(process.env.ETHEREUM_JSON_RPC_URL));

app.post('/getTransactions', async (req, res) => {
    web3js.eth.getBlock('latest', function (err, num) {
        console.log('num', num);
        console.log('err', err.message);
    });
    // web3js.eth.getBlock(req.body.blockStart, true)
    //     .then((data) => {
    //         res.status(200).send(data && data.transactions ? data.transactions : null)
    //     })
    //     .catch((err) => {
    //         res.status(500).send(err.message);
    //     });
});

app.post('/getTransaction', (req, res) => {
    const hash = web3js.utils.toHex(req.body.hash);
    web3js.eth.getTransaction(hash)
        .then((transaction) => {
            res.status(200).send(transaction);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send(err.message);
        });
});

app.post('/send', (req, res) => {
    var myAddress = web3js.utils.toHex(req.body.from);
    var privateKey = Buffer.from(req.body.private, 'hex');
    var toAddress = web3js.utils.toHex(req.body.to);
    var value = web3js.utils.toHex(web3.utils.toWei(req.body.value));

    const transactionData = {
        "from": myAddress,
        "to": toAddress,
        "value": value,
        "gasPrice": web3js.utils.toHex(web3.utils.toWei(process.env.ETHEREUM_GAS_PRICE_GWEI, 'gwei')),
        "gasLimit": web3js.utils.toHex(process.env.ETHEREUM_GAS_LIMIT)
    };

    // now standard price is 16.5 Gwei
    // web3js.eth.getGasPrice().then((gasPrice) => {
    //     transactionData.gasPrice = web3js.utils.toHex(gasPrice);
    // });

    // for default transaction 21000gas
    // web3js.eth.estimateGas(transactionData).then((estimateGas) => {
    //     transactionData.gasLimit = web3js.utils.toHex(estimateGas);
    // });

    web3js.eth.getTransactionCount(myAddress, 'pending').then((count) => {
        transactionData.nonce = parseInt(count);

        const transaction = new Tx(transactionData);
        transaction.sign(privateKey);

        const transactionHex = transaction
            .serialize()
            .toString('hex');

        web3js.eth
            .sendSignedTransaction('0x' + transactionHex)
            .on('transactionHash', (hash) => {
                console.log('transactionHash', hash);
                res.status(200).send(hash);
            })
            .catch((err) => {
                //Когда кончился ГАЗ на кошельке или указано слишком маленькое значение ГАЗа
                //Returned error: intrinsic gas too low

                //Когда сумма перевода низкая или неверно указано количество ГАЗа
                //Returned error: transaction underpriced

                //Когда баланса не достаточно
                //Returned error: insufficient funds for gas * price + value

                //Как правило это внутренняя ошибка, не связанная с действиями пользователя
                //Returned error: nonce too low
                res.status(500).send(err.message);
            });
    })
});

app.post('/getBalance', (req, res) => {
    const address = web3js.utils.toHex(req.body.hash);

    web3js.eth.getBalance(address)
        .then((balance) => {
            res.status(200).send(balance);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send(err.message);
        });
});

app.listen(process.env.PORT, () => console.log('Started on port: ' + process.env.PORT));

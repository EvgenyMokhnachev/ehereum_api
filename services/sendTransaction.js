const Tx = require('ethereumjs-tx').Transaction;
const web3 = require('web3');
const web3js = new web3(new web3.providers.HttpProvider(process.env.ETHEREUM_JSON_RPC_URL));
const TransactionDTO = require('./../TransactionDTO');
const abi = require('./../abi');

module.exports = async function sendTransaction(from, privateKey, to, value, contractHex) {
    const fromHex = web3js.utils.toHex(from);
    const privateBuf = Buffer.from(privateKey, 'hex');
    const toHex = web3js.utils.toHex(to);

    const valueWei = web3.utils.toWei(value);
    const valueWeiHex = web3js.utils.toHex(valueWei);

    const transactionData = {
        "from": fromHex,
        "to": toHex,
        "value": valueWeiHex
    };

    if (contractHex) {
        const contract = new web3js.eth.Contract(abi[contractHex.toLowerCase()], contractHex);
        transactionData.to = contractHex;
        transactionData.value = web3js.utils.toHex(0);
        transactionData.data = contract.methods.transfer(to, valueWei).encodeABI();

        transactionData.gasLimit = await contract.methods.transfer(to, valueWeiHex).estimateGas({from: fromHex});
    }

    const gasPriceWei = web3.utils.toWei(process.env.ETHEREUM_GAS_PRICE_GWEI, 'gwei');
    // const gasPriceWeiFromApi = await web3js.eth.getGasPrice();
    transactionData.gasPrice = web3.utils.toHex(gasPriceWei);

    const gasLimit = transactionData.gasLimit ? transactionData.gasLimit : process.env.ETHEREUM_GAS_LIMIT;
    // const gasLimitFromApi = await web3js.eth.estimateGas(transactionData);
    transactionData.gasLimit = web3.utils.toHex(gasLimit);

    const nonceCount = await web3js.eth.getTransactionCount(fromHex, 'pending');
    transactionData.nonce = parseInt(nonceCount);

    const transaction = new Tx(transactionData);
    transaction.sign(privateBuf);

    const transactionHex = transaction
        .serialize()
        .toString('hex');

    return await new Promise(async (resolve, reject) => {
        web3js.eth
            .sendSignedTransaction('0x' + transactionHex)
            .on('receipt', receipt => {
                console.log('receipt', receipt);
            })
            .on('transactionHash', (hash) => {
                resolve(
                    new TransactionDTO(null, null, hash, null, contractHex,
                        fromHex, toHex, gasLimit, gasPriceWei, valueWei)
                );
            })
            .catch((err) => {
                //Когда кончился ГАЗ на кошельке или указано слишком маленькое значение ГАЗа
                //Returned error: intrinsic gas too low

                //Когда неверно указано количество ГАЗа
                //Returned error: transaction underpriced

                //Когда баланса не достаточно
                //Returned error: insufficient funds for gas * price + value

                //Как правило это внутренняя ошибка, не связанная с действиями пользователя
                //Returned error: nonce too low
                reject(err);
                throw err;
            });
    });
};

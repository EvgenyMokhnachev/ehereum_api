const web3 = require('web3');

module.exports = function TransactionDTO(
    blockNumber,
    timestamp,
    hash,
    status,
    contract,
    from,
    to,
    gas,
    gasPriceWei,
    valueWei
) {
    this.blockNumber = blockNumber;
    this.timestamp = timestamp;
    this.hash = hash;
    this.status = status ? (status.toString() === 'true' ? true : status.toString() === 'false' ? false : null) : null;
    this.contract = contract;
    this.from = from;
    this.to = to;
    this.gas = gas;
    this.gasPrice = gasPriceWei ? web3.utils.fromWei(gasPriceWei) : null;
    this.fee = gas && gasPriceWei ? (web3.utils.fromWei((gas * gasPriceWei) + '')) : null;
    this.value = valueWei ? web3.utils.fromWei(valueWei) : null;
};

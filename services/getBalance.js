const web3 = require('web3');
const web3js = new web3(new web3.providers.HttpProvider(process.env.ETHEREUM_JSON_RPC_URL));
const abi = require('./../abi.js');

module.exports = async function getBalance(walletHash, contractHash) {
    if (!contractHash) {
        const hash = web3js.utils.toHex(walletHash);
        return await web3js.eth.getBalance(hash);
    } else {
        const contract = new web3js.eth.Contract(abi[contractHash.toLowerCase()], contractHash);
        return await contract.methods.balanceOf(walletHash).call();
    }
};

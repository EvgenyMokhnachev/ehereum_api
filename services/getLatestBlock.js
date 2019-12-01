const web3 = require('web3');
const web3js = new web3(new web3.providers.HttpProvider(process.env.ETHEREUM_JSON_RPC_URL));

module.exports = async function getLatestBlock(blockNumber) {
    return await web3js.eth.getBlock('latest');
};

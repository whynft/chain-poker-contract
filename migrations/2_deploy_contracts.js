const PokerUtils = artifacts.require('PokerUtils');
const PokerRoom = artifacts.require('PokerRoom');

const defaultFeeWei = 2500000000000000;
const defaultPrimeModulo =  "57896044618658097711785492504343953926634992332820282019728792003956564819937"; // 2 ^ 555 - 31


module.exports = function (deployer) {
    deployer.deploy(PokerUtils).then(() => {
        deployer.deploy(PokerRoom, defaultFeeWei, defaultPrimeModulo);
    });
    deployer.link(PokerUtils, PokerRoom);
};
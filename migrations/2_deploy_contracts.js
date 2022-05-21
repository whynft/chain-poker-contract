const PokerUtils = artifacts.require('PokerUtils');
const PokerRoom = artifacts.require('PokerRoom');

const defaultFeeWei = 2500000000000000;
const defaultPrimeModulo =  "340282366920938463463374607431768211297"; // 2 ^ 128 - 159


module.exports = function (deployer) {
    deployer.deploy(PokerUtils).then(() => {
        deployer.deploy(PokerRoom, defaultFeeWei, defaultPrimeModulo);
    });
    deployer.link(PokerUtils, PokerRoom);
};
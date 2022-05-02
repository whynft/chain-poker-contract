const utils = require("./utils");
const PokerRoom = artifacts.require("PokerRoom");

const defaultFeeWei = 2500000000000000;
const defaultSmallBlind = 2500000000000000;
const defaultPrimeModulo = Math.pow(2, 255) - 31;

contract("PokerRoom", (accounts) => {
    let [alice, bob, backend, someOneWhoDeployedNftContract] = accounts;
    let contractInstance;

    beforeEach(async () => {
        contractInstance = await PokerRoom.new(defaultFeeWei, defaultPrimeModulo, {from: backend});
    });
    // afterEach(async () => {
    //    await contractInstance.kill();
    // });

    context("Primitive checks", async () => {
        it("Should commission be equal as set", async () => {
            const gameFee = await contractInstance.gameFee();
            assert.equal(gameFee, defaultFeeWei);
        })
    })
})
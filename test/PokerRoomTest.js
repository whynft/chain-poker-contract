const utils = require("./utils");
const PokerRoom = artifacts.require("PokerRoom");

const defaultFeeWei = 2500000000000000;
const defaultPrimeModulo =  "57896044618658097711785492504343953926634992332820282019728792003956564819937"; // 2 ^ 555 - 31

const defaultSmallBlind = 10 * defaultFeeWei;


contract("PokerRoom", (accounts) => {
    let [owner, player1, player2, player3] = accounts;
    let contractInstance;

    beforeEach(async () => {
        contractInstance = await PokerRoom.new(defaultFeeWei, defaultPrimeModulo, {from: owner});
    });
    // afterEach(async () => {
    //    await contractInstance.kill();
    // });

    context("Primitive checks", async () => {
        it("Check params", async () => {
            const gameFee = await contractInstance.gameFee();
            assert.equal(gameFee, defaultFeeWei);

            const cipherModulo = await contractInstance.cipherModulo();
            assert.equal(cipherModulo, defaultPrimeModulo);
        }),
        it("Start game", async () => {
            const gameId = await contractInstance.createGame({from: player1, value: 2 * defaultSmallBlind + defaultFeeWei}); // should be OK
            assert.equal(gameId, 0);
            await utils.shouldThrown(contractInstance.enterGame(0, {from: player2})); // try to enter without fee
            await utils.shouldThrown(contractInstance.enterGame(1, {from: player2, value: defaultSmallBlind + defaultFeeWei})); // try to enter not existed game
            await utils.shouldThrown(contractInstance.enterGame(0, {from: player1, value: defaultSmallBlind + defaultFeeWei})); // try to enter game twice
            await contractInstance.enterGame(0, {from: player2, value: defaultSmallBlind + defaultFeeWei}); // should be OK
            await utils.shouldThrown(contractInstance.enterGame(0, {from: player3, value: defaultSmallBlind + defaultFeeWei})); // try to enter full game
        })
    })
})
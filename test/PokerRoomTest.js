const utils = require("./utils");
const PokerRoom = artifacts.require("PokerRoom");

const defaultFeeWei = 2500000000000000;
const defaultPrimeModulo =  "57896044618658097711785492504343953926634992332820282019728792003956564819937"; // 2 ^ 555 - 31

const defaultSmallBlind = 10 * defaultFeeWei;

const gameId = 0;

var startGame = async function(contractInstance, player1, player2) {
    await contractInstance.createGame({from: player1, value: 2 * defaultSmallBlind + defaultFeeWei}); // should be OK
    await contractInstance.enterGame(gameId, {from: player2, value: defaultSmallBlind + defaultFeeWei}); // should be OK
};

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
            const result = await contractInstance.createGame({from: player1, value: 2 * defaultSmallBlind + defaultFeeWei}); // should be OK
            await utils.shouldThrow(contractInstance.enterGame(gameId, {from: player2})); // try to enter without fee
            await utils.shouldThrow(contractInstance.enterGame(1, {from: player2, value: defaultSmallBlind + defaultFeeWei})); // try to enter not existed game
            await utils.shouldThrow(contractInstance.enterGame(gameId, {from: player1, value: defaultSmallBlind + defaultFeeWei})); // try to enter game twice
            await contractInstance.enterGame(gameId, {from: player2, value: defaultSmallBlind + defaultFeeWei}); // should be OK
            await utils.shouldThrow(contractInstance.enterGame(gameId, {from: player3, value: defaultSmallBlind + defaultFeeWei})); // try to enter full game
        }),
        it("Submit hashes", async () => {
            await startGame(contractInstance, player1, player2);
            const player1Card1Hash = "13159035226703211890654003961158071376254143192955391095350192585677108936704"; // P1(0)
            const player1Card2Hash = "37878010719124385700487666027363824721736664517050548994860851193330156557245"; // P1(1)
            const player2Card1Hash = "1371063945196131339848710285958978166078362773706306138144768"; // P2(2)
            const player2Card2Hash = "47973127203639628266168456194645044912891966240061260446654987028540843575624"; // P2(3)
            await utils.shouldThrow(contractInstance.provideCardHashesForDealing(gameId, 0, 0, {from: player2})); // player1 should call first
            contractInstance.provideCardHashesForDealing(gameId, player2Card1Hash, player2Card2Hash, {from: player1});
            await utils.shouldThrow(contractInstance.provideCardHashesForDealing(gameId, 0, 0, {from: player1})); // player2 should call second
            contractInstance.provideCardHashesForDealing(gameId, player1Card1Hash, player1Card2Hash, {from: player2});
        })
    })
})
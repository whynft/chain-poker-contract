const utils = require("./utils");
const PokerRoom = artifacts.require("PokerRoom");

const defaultFeeWei = 2500000000000000;
const defaultPrimeModulo =  "57896044618658097711785492504343953926634992332820282019728792003956564819937"; // 2 ^ 555 - 31

const defaultSmallBlind = 10 * defaultFeeWei;

const PRIVATE_KEY1 = 1003;
const PRIVATE_KEY2 = 725;

const player1Card1Hash = "13159035226703211890654003961158071376254143192955391095350192585677108936704"; // P(0, 1003)
const player1Card2Hash = "37878010719124385700487666027363824721736664517050548994860851193330156557245"; // P(1, 1003)
const player2Card1Hash = "1371063945196131339848710285958978166078362773706306138144768"; // P(2, 725)
const player2Card2Hash = "47973127203639628266168456194645044912891966240061260446654987028540843575624"; // P2(3, 725)

const gameId = 0;

const WAITING = 0;
const DEALING = 1;
const PREFLOP = 2;
const OPEN_FLOP = 3;
const FLOP = 4;
const OPEN_TURN = 5;
const TURN = 6;
const OPEN_RIVER = 7;
const RIVER = 8;
const SHOWDOWN = 9;
const WINNER_CHOOSEN = 10;

const FOLD = 0;
const CHECK = 1;
const CALL = 2;
const RAISE = 3;

const flop1Card = 51;
const flop1Hash = "36269910134637692301191280936545014088062668828491852538865721109308595924584"; // P(51, 1003)
const flop2Card = 50;
const flop2Hash = "34381642344438337666813628472069947310014149110431092870235554744912971285930"; // P(50, 1003)
const flop3Card = 49;
const flop3Hash = "3639468522743208840451633774131289835802606952387558348786238478751188008782"; // P(49, 1003)
const turnCard = 48;
const turnHash = "30747613039493320745679180783621670933150359188574931733221699170699648328184"; // P(48, 1003)
const riverCard = 47;
const riverHash = "52188306373810188909554202865183694489674105885738453368448548953776311023155"; // P(47, 1003)

var startGame = async function(contractInstance, player1, player2) {
    await contractInstance.createGame({from: player1, value: 2 * defaultSmallBlind + defaultFeeWei}); // should be OK
    await contractInstance.enterGame(gameId, {from: player2, value: defaultSmallBlind + defaultFeeWei}); // should be OK
};

var submitHashes = async function(contractInstance, player1, player2, p1c1h, p1c2h, p2c1h, p2c2h) {
    await contractInstance.provideCardHashesForDealing(gameId, p1c1h, p1c2h, {from: player1});
    await contractInstance.provideCardHashesForDealing(gameId, p2c1h, p2c2h, {from: player2});
};

var submitRound = async function(contractInstance, player1, player2, gameStateCode, action1, action2, values) {
    await contractInstance.makeTurn(gameId, gameStateCode, action1, {from: player1, value: values[0]});
    await contractInstance.makeTurn(gameId, gameStateCode, action2, {from: player2, value: values[1]});
};

var openCards = async function(contractInstance, player1, player2, gameStateCode, cardHashes, cards) {
//    await contractInstance.openNextCards(gameId, gameStateCode, cardHashes, cards, {from: player1});
    await contractInstance.openNextCards(gameId, gameStateCode, cardHashes, cards, {from: player2});
};

var runGameFromConfig = async function(contractInstance, player1, player2, actionsConfig, cardsConfig, betConfig) {
    await startGame(contractInstance, player1, player2);
    await submitHashes(contractInstance, player1, player2, player1Card1Hash, player1Card2Hash, player2Card1Hash, player2Card2Hash);
//    PREFLOP
    await contractInstance.makeTurn(gameId, PREFLOP, actionsConfig.PREFLOP[0], {from: player2, value: betConfig.PREFLOP[0]});
    await contractInstance.makeTurn(gameId, PREFLOP, actionsConfig.PREFLOP[1], {from: player1, value: betConfig.PREFLOP[1]});
//    await submitRound(contractInstance, player1, player2, PREFLOP, actionsConfig.PREFLOP[0], actionsConfig.PREFLOP[1], betConfig.PREFLOP);
//    OPEN_FLOP
    await openCards(contractInstance, player1, player2, OPEN_FLOP, cardsConfig.OPEN_FLOP["hashes"], cardsConfig.OPEN_FLOP["cards"]);
////    FLOP
    await submitRound(contractInstance, player1, player2, FLOP, actionsConfig.FLOP[0], actionsConfig.FLOP[1], betConfig.FLOP);
////    OPEN_TURN
//    await openCards(contractInstance, player1, player2,  OPEN_TURN, cardsConfig.OPEN_TURN["hashes"], cardsConfig.OPEN_TURN["cards"]);
////    TURN
//    await submitRound(contractInstance, player1, player2,  TURN, actionsConfig.TURN[0], actionsConfig.TURN[1], betConfig.TURN);
////    OPEN_RIVER
//    await openCards(contractInstance, player1, player2,  OPEN_RIVER, cardsConfig.OPEN_RIVER["hashes"], cardsConfig.OPEN_RIVER["cards"]);
////    RIVER
//    await submitRound(contractInstance, player1, player2,  RIVER, actionsConfig.RIVER[0], actionsConfig.RIVER[1], betConfig.RIVER);
//    SHOWDOWN
//    WINNER_CHOOSEN
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
        it("Test interface", async () => {
            properties = ["setOwner", "setGameFee", "setCipherModulo",
            "createGame", "enterGame", "provideCardHashesForDealing", "openNextCards", "makeTurn", "submitKeys", "claimWin"];
            properties.forEach(property => {
                assert.equal(property in contractInstance, true, "can't find property " + property);
            });
        })
        it("Check params", async () => {
            const gameFee = await contractInstance.gameFee();
            assert.equal(gameFee, defaultFeeWei);

            const cipherModulo = await contractInstance.cipherModulo();
            assert.equal(cipherModulo, defaultPrimeModulo);
        })
        it("Start game", async () => {
            const result = await contractInstance.createGame({from: player1, value: 2 * defaultSmallBlind + defaultFeeWei}); // should be OK
            await utils.shouldThrow(contractInstance.enterGame(gameId, {from: player2})); // try to enter without fee
            await utils.shouldThrow(contractInstance.enterGame(1, {from: player2, value: defaultSmallBlind + defaultFeeWei})); // try to enter not existed game
            await utils.shouldThrow(contractInstance.enterGame(gameId, {from: player1, value: defaultSmallBlind + defaultFeeWei})); // try to enter game twice
            await contractInstance.enterGame(gameId, {from: player2, value: defaultSmallBlind + defaultFeeWei}); // should be OK
            await utils.shouldThrow(contractInstance.enterGame(gameId, {from: player3, value: defaultSmallBlind + defaultFeeWei})); // try to enter full game
        })
        it("Submit hashes", async () => {
            await startGame(contractInstance, player1, player2);
            await utils.shouldThrow(contractInstance.provideCardHashesForDealing(gameId, 0, 0, {from: player2})); // player1 should call first
            contractInstance.provideCardHashesForDealing(gameId, player2Card1Hash, player2Card2Hash, {from: player1});
            await utils.shouldThrow(contractInstance.provideCardHashesForDealing(gameId, 0, 0, {from: player1})); // player2 should call second
            contractInstance.provideCardHashesForDealing(gameId, player1Card1Hash, player1Card2Hash, {from: player2});
        })
    })
    context("Full game", async () => {
        it("run check game", async () => {
            const actionsConfig = {
                PREFLOP: [CALL, CHECK],
                FLOP: [CHECK, CHECK],
                TURN: [CHECK, CHECK],
                RIVER: [CHECK, CHECK]
            }
            const cardsConfig = {
                OPEN_FLOP: {
                    "hashes": [flop1Hash, flop2Hash, flop3Hash],
                    "cards": [flop1Card, flop2Card, flop3Card]
                },
                OPEN_TURN: {
                    "hashes": [turnHash, 0, 0],
                    "cards": [turnCard, 0, 0]
                },
                OPEN_RIVER: {
                    "hashes": [riverHash, 0, 0],
                    "cards": [riverCard, 0, 0]
                }
            }
            const betConfig = {
                PREFLOP: [defaultSmallBlind, 0],
                FLOP: [0, 0],
                TURN: [0, 0],
                RIVER: [0, 0]
            }
            await runGameFromConfig(contractInstance, player1, player2, actionsConfig, cardsConfig, betConfig);
        })
    })
})
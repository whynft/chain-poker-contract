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
const player2Card2Hash = "41430621872242563686864929739397623096781312338139806270879406045932151681544"; // P2(4, 725)

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

const SET = 3;
const FULL_HOUSE = 6;

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
const turnHash = "49214131031210055892543999779736725703953186589776906119812339318913166722083"; // P(5, 1003)
const riverCard = 47;
const riverHash = "52188306373810188909554202865183694489674105885738453368448548953776311023155"; // P(47, 1003)

function makeCardIdFromPair(cardParams) {
    return cardParams[0] * 4 + cardParams[1];
}

function makeCombinationIdFrom5CardHand(cards) {
    var result = 0;
    for (let i = 0;i < 5; ++i) {
        result *= 52;
        result += cards[4 - i];
    }
    return result;
}

var startGame = async function(contractInstance, player1, player2) {
    await contractInstance.createGame({from: player1, value: 2 * defaultSmallBlind + defaultFeeWei});
    await contractInstance.enterGame(gameId, {from: player2, value: defaultSmallBlind + defaultFeeWei});
};

var submitHashes = async function(contractInstance, player1, player2, p1c1h, p1c2h, p2c1h, p2c2h) {
    await contractInstance.provideCardHashesForDealing(gameId, p1c1h, p1c2h, {from: player1});
    await contractInstance.provideCardHashesForDealing(gameId, p2c1h, p2c2h, {from: player2});
};

var execActionFromConfig = async function(config) {
    if (config["action"] == "makeTurn") {
        await config["contractInstance"].makeTurn(
            config["gameId"],
            config["gameStateCode"],
            config["actionType"],
            {from: config["player"], value: config["value"]});
        return;
    }
    if (config["action"] == "openCards") {
        await config["contractInstance"].openNextCards(
            config["gameId"],
            config["gameStateCode"],
            config["cardHashes"],
            config["cards"],
            {from: config["player"]});
        return;
    }

    if (config["action"] == "submitKeys") {
        await config["contractInstance"].submitKeys(
            config["gameId"],
            config["privatePower"],
            config["claimedHandCode"],
            config["claimedCombination"],
            {from: config["player"]}
            );
        return;
    }
    assert(false);
};

var execGameFromConfig = async function(commonConfig, actions) {
    await startGame(commonConfig["contractInstance"], commonConfig["players"][0], commonConfig["players"][1]);
    await submitHashes(commonConfig["contractInstance"], commonConfig["players"][0], commonConfig["players"][1], player1Card1Hash, player1Card2Hash, player2Card1Hash, player2Card2Hash);
    const commonFields = ["contractInstance", "gameId"]
    for (action of actions) {
        commonFields.forEach(field => {
                action[field] = commonConfig[field];
            }
        );
        await execActionFromConfig(action);
    }
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

    context("Primitive checks", async () => {
        it("Test interface", async () => {
            properties = ["transferOwnership", "setGameFee", "setCipherModulo",
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
//            const actionsConfig = {
//                PREFLOP: [CALL, CHECK],
//                FLOP: [CHECK, CHECK],
//                TURN: [CHECK, CHECK],
//                RIVER: [CHECK, CHECK]
//            }
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

            const commonConfig = {
                "contractInstance": contractInstance,
                "gameId": 0,
                "players": [player1, player2]
            }

            const actionsConfig = [
                {
                    "action": "makeTurn",
                    "player": player2,
                    "value": defaultSmallBlind,
                    "gameStateCode": PREFLOP,
                    "actionType": CALL
                },
                {
                    "action": "makeTurn",
                    "player": player1,
                    "value": 0,
                    "gameStateCode": PREFLOP,
                    "actionType": CHECK
                },
                {
                    "action": "openCards",
                    "player": player2,
                    "value": 0,
                    "gameStateCode": OPEN_FLOP,
                    "cards": [flop1Card, flop2Card, flop3Card],
                    "cardHashes": [flop1Hash, flop2Hash, flop3Hash]
                },
                {
                    "action": "makeTurn",
                    "player": player2,
                    "value": 0,
                    "gameStateCode": FLOP,
                    "actionType": CHECK
                },
                {
                    "action": "makeTurn",
                    "player": player1,
                    "value": 0,
                    "gameStateCode": FLOP,
                    "actionType": CHECK
                },
                {
                    "action": "openCards",
                    "player": player2,
                    "value": 0,
                    "gameStateCode": OPEN_TURN,
                    "cards": [turnCard],
                    "cardHashes": [turnHash]
                },
                {
                    "action": "makeTurn",
                    "player": player2,
                    "value": 0,
                    "gameStateCode": TURN,
                    "actionType": CHECK
                },
                {
                    "action": "makeTurn",
                    "player": player1,
                    "value": 0,
                    "gameStateCode": TURN,
                    "actionType": CHECK
                },
                {
                    "action": "openCards",
                    "player": player2,
                    "value": 0,
                    "gameStateCode": OPEN_RIVER,
                    "cards": [riverCard],
                    "cardHashes": [riverHash]
                },
                {
                    "action": "makeTurn",
                    "player": player2,
                    "value": 0,
                    "gameStateCode": RIVER,
                    "actionType": CHECK
                },
                {
                    "action": "makeTurn",
                    "player": player1,
                    "value": 0,
                    "gameStateCode": RIVER,
                    "actionType": CHECK
                },
                {
                    "action": "submitKeys",
                    "player": player2,
                    "value": 0,
                    "privatePower": PRIVATE_KEY2,
                    "claimedHandCode": makeCombinationIdFrom5CardHand([49, 50, 51, 4, 5]), // hand:(0,2) - 2, (1,0) - 4, table: (1, 1) - 5, (11, 3) - 47, (12, 1) - 49, (12, 2) - 50, (12, 3) - 51
                    "claimedCombination": FULL_HOUSE // full house combination: 12x3 + 1x2
                },
            ]

//                        config["privatePower"],
//            config["claimedHandCode"],
//            config["claimedCombination"],

            await execGameFromConfig(commonConfig, actionsConfig);
        })
    })
})
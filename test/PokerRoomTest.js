const utils = require("./utils");
const PokerRoom = artifacts.require("PokerRoom");

const defaultFeeWei = 2500000000000000;

const defaultPrimeModulo =  "340282366920938463463374607431768211297"; // 2 ^ 128 - 159

const defaultSmallBlind = 10 * defaultFeeWei;

const PRIVATE_KEY1 = 1003;
const PRIVATE_KEY2 = 725;

const player1Card1Hash = "205381139980068277633160390919071830822"; // P1(0, 1003)
const player1Card2Hash = "102556355728778912194778419807133212971"; // P1(1, 1003)
const player2Card1Hash = "7221512800809898655060050269947559936"; // P2(2, 725)
const player2Card2Hash = "123847454697520124946205291478140896941"; // P2(4, 725)

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
const FOUR_OF_A_KIND = 7;

const FOLD = 0;
const CHECK = 1;
const CALL = 2;
const RAISE = 3;

const flop1Card = 51;
const flop1Hash = "300891920437880970838369362784543108170"; // P(51, 1003)
const flop2Card = 50;
const flop2Hash = "100343920168981772056721231748499674163"; // P(50, 1003)
const flop3Card = 49;
const flop3Hash = "205895857969606427066682613779702939114"; // P(49, 1003)
const turnCard = 5;
const turnHash = "98602134968864167172559311264648553796"; // P(5, 1003)
const turnCard2 = 48;
const turnHash2 = "94609031958525385136570985174710303027"; // P(48, 1003)
const riverCard = 47;
const riverHash = "291835422713370007735409061104409365296"; // P(47, 1003)

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
    await contractInstance.provideCardHashesForDealing(gameId, p2c1h, p2c2h, {from: player1});
    await contractInstance.provideCardHashesForDealing(gameId, p1c1h, p1c2h, {from: player2});
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
    if (config["action"] == "claimWin") {
        await config["contractInstance"].claimWin(
            config["gameId"],
            {from: config["player"]}
        );
        return;
    }
    if (config["action"] == "claimDraw") {
        await config["contractInstance"].claimDraw(
            config["gameId"],
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

contract("PokerRoom", (accounts) => {
    let [owner, player1, player2, player3] = accounts;
    let contractInstance;
    let defaultGameActionConfig;

    beforeEach(async () => {
        contractInstance = await PokerRoom.new(defaultFeeWei, defaultPrimeModulo, {from: owner});
        defaultGameActionConfig = [
                { "action": "makeTurn", "player": player2, "value": defaultSmallBlind, "gameStateCode": PREFLOP, "actionType": CALL },
                { "action": "makeTurn", "player": player1, "value": 0, "gameStateCode": PREFLOP, "actionType": CHECK },
                { "action": "openCards", "player": player2, "value": 0, "gameStateCode": OPEN_FLOP, "cards": [flop1Card, flop2Card, flop3Card], "cardHashes": [flop1Hash, flop2Hash, flop3Hash] },
                { "action": "makeTurn", "player": player2, "value": 0, "gameStateCode": FLOP, "actionType": CHECK },
                { "action": "makeTurn", "player": player1, "value": 0, "gameStateCode": FLOP, "actionType": CHECK },
                { "action": "openCards", "player": player2, "value": 0, "gameStateCode": OPEN_TURN, "cards": [turnCard], "cardHashes": [turnHash] },
                { "action": "makeTurn", "player": player2, "value": 0, "gameStateCode": TURN, "actionType": CHECK },
                { "action": "makeTurn", "player": player1, "value": 0, "gameStateCode": TURN, "actionType": CHECK },
                { "action": "openCards", "player": player2, "value": 0, "gameStateCode": OPEN_RIVER, "cards": [riverCard], "cardHashes": [riverHash] },
                { "action": "makeTurn", "player": player2, "value": 0, "gameStateCode": RIVER, "actionType": CHECK },
                { "action": "makeTurn", "player": player1, "value": 0, "gameStateCode": RIVER, "actionType": CHECK },
                { "action": "submitKeys", "player": player2, "value": 0, "privatePower": PRIVATE_KEY2,
                    "claimedHandCode": makeCombinationIdFrom5CardHand([49, 50, 51, 4, 5]), // hand:(0,2) - 2, (1,0) - 4, table: (1, 1) - 5, (11, 3) - 47, (12, 1) - 49, (12, 2) - 50, (12, 3) - 51
                    "claimedCombination": FULL_HOUSE // full house combination: 12x3 + 1x2
                },
                { "action": "submitKeys", "player": player1, "value": 0, "privatePower": PRIVATE_KEY1,
                    "claimedHandCode": makeCombinationIdFrom5CardHand([49, 50, 51, 47, 5]), // hand:(0,0) - 0, (0,1) - 1, table: (1, 1) - 5, (11, 3) - 47, (12, 1) - 49, (12, 2) - 50, (12, 3) - 51
                    "claimedCombination": SET // set combination: 12x3 + 47x1 + 5x1
                },
                { "action": "claimWin", "player": player2 }
            ]
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
        it("Start one game", async () => {
            const result = await contractInstance.createGame({from: player1, value: 2 * defaultSmallBlind + defaultFeeWei}); // should be OK
            await utils.shouldThrow(contractInstance.enterGame(gameId, {from: player2})); // try to enter without fee
            await utils.shouldThrow(contractInstance.enterGame(1, {from: player2, value: defaultSmallBlind + defaultFeeWei})); // try to enter not existed game
            await utils.shouldThrow(contractInstance.enterGame(gameId, {from: player1, value: defaultSmallBlind + defaultFeeWei})); // try to enter game twice
            await contractInstance.enterGame(gameId, {from: player2, value: defaultSmallBlind + defaultFeeWei}); // should be OK
            await utils.shouldThrow(contractInstance.enterGame(gameId, {from: player3, value: defaultSmallBlind + defaultFeeWei})); // try to enter full game
        })
        it("Start many games", async () => {
            const result0 = await contractInstance.createGame({from: player1, value: 2 * defaultSmallBlind + defaultFeeWei});
            await contractInstance.enterGame(gameId, {from: player2, value: defaultSmallBlind + defaultFeeWei});
            const result1 = await contractInstance.createGame({from: player2, value: 4 * defaultSmallBlind + defaultFeeWei});
            await contractInstance.enterGame(gameId + 1, {from: player1, value: 2 * defaultSmallBlind + defaultFeeWei});
            const result2 = await contractInstance.createGame({from: player1, value: 2 * defaultSmallBlind + defaultFeeWei});
            const result3 = await contractInstance.createGame({from: player1, value: 2 * defaultSmallBlind + defaultFeeWei});
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
            const commonConfig = {
                "contractInstance": contractInstance,
                "gameId": 0,
                "players": [player1, player2]
            }

            await execGameFromConfig(commonConfig, defaultGameActionConfig);
            await utils.shouldThrow(contractInstance.claimWin(gameId, {from: player2})); // claim win twice
            await utils.shouldThrow(contractInstance.claimWin(gameId, {from: player1})); // winner has been already announced
            await utils.shouldThrow(contractInstance.claimDraw(gameId, {from: player2})); // draw is not announced
            await utils.shouldThrow(contractInstance.claimDraw(gameId, {from: player1})); // draw is not announced
        })
        it("run game with fold", async () => {
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
                    "actionType": FOLD
                },
                {
                    "action": "claimWin",
                    "player": player1
                }
            ]
            await execGameFromConfig(commonConfig, actionsConfig);
        })
        it("run game with raises and equal combinations", async () => {
            const commonConfig = {
                "contractInstance": contractInstance,
                "gameId": 0,
                "players": [player1, player2]
            }

            const actionsConfig = [
                {
                    "action": "makeTurn",
                    "player": player2,
                    "value": 3 * defaultSmallBlind,
                    "gameStateCode": PREFLOP,
                    "actionType": RAISE
                },
                {
                    "action": "makeTurn",
                    "player": player1,
                    "value": 2 * defaultSmallBlind,
                    "gameStateCode": PREFLOP,
                    "actionType": CALL
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
                    "cards": [turnCard2],
                    "cardHashes": [turnHash2]
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
                    "claimedHandCode": makeCombinationIdFrom5CardHand([48, 49, 50, 51, 47]), // hand:(0,2) - 2, (1,0) - 4, table: (11, 3) - 47, (12, 0) - 48, (12, 1) - 49, (12, 2) - 50, (12, 3) - 51
                    "claimedCombination": FOUR_OF_A_KIND // four of a kind(care) combination: 12x4 + 11x1
                },
                {
                    "action": "submitKeys",
                    "player": player1,
                    "value": 0,
                    "privatePower": PRIVATE_KEY1,
                    "claimedHandCode": makeCombinationIdFrom5CardHand([48, 49, 50, 51, 47]), // hand:(0,2) - 2, (1,0) - 4, table: (11, 3) - 47, (12, 0) - 48, (12, 1) - 49, (12, 2) - 50, (12, 3) - 51
                    "claimedCombination": FOUR_OF_A_KIND // four of a kind(care) combination: 12x4 + 11x1
                },
                {
                    "action": "claimDraw",
                    "player": player1
                },
                {
                    "action": "claimDraw",
                    "player": player2
                }
            ]
            await execGameFromConfig(commonConfig, actionsConfig);
            await utils.shouldThrow(contractInstance.claimWin(gameId, {from: player2})); // winner is not announced
            await utils.shouldThrow(contractInstance.claimWin(gameId, {from: player1})); // winner is not announced
            await utils.shouldThrow(contractInstance.claimDraw(gameId, {from: player2})); // can't claim draw twice
            await utils.shouldThrow(contractInstance.claimDraw(gameId, {from: player1})); // can't claim draw twice
        })
    })

})
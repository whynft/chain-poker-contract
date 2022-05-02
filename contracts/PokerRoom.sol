// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import './PokerUtils.sol';

contract PokerRoom is Ownable {
    uint private constant N_PLAYERS = 2;
    uint private constant N_PRIVATE_CARDS = 2;
    uint private constant N_PUBLIC_CARDS = 5;

    uint private constant DEALER_POSITION = 0;
    uint private constant SMALL_BLIND_POSITION = 1;
    uint private constant BIG_BLIND_POSITION = 2;

    enum GameState {
        WAITING,
        DEALING,
        PREFLOP,
        OPEN_FLOP,
        FLOP,
        OPEN_TURN,
        TURN,
        OPEN_RIVER,
        RIVER,
        SHOWDOWN,
        WINNER_CHOOSEN
    }

    enum ActionType {
        FOLD,
        CHECK,
        CALL,
        RAISE
    }

    mapping(GameState => uint8) NEED_CARDS_AT_STATE;
    mapping(GameState => uint8) OPEN_CARDS_AT_STATE;

    using Counters for Counters.Counter;
    Counters.Counter private _gameCount;

    uint256 public cipherModulo;
    uint256 public gameFee;

    address[][] private players;
    uint256[][][] private cardHashes;
    uint256[] private smallBlinds;
    uint256[] private maxPot;
    address[] private winner;
    uint256[] private winnerRank;
    uint256[][] private publicCards;
    uint256[][] private publicCardsHashes;
    uint256[][] private pots;
    uint[] private roundNumbers;
    GameState[] private gameState;
    address[] private actionExpectedFrom;
    mapping(uint => mapping(address => uint)) private player2position;


    constructor(uint256 gameFee_, uint256 cipherModulo_) {
        gameFee = gameFee_;
        cipherModulo = cipherModulo_;
        OPEN_CARDS_AT_STATE[GameState.OPEN_FLOP] = 3;
        OPEN_CARDS_AT_STATE[GameState.OPEN_TURN] = 4;
        OPEN_CARDS_AT_STATE[GameState.OPEN_RIVER] = 5;

        NEED_CARDS_AT_STATE[GameState.OPEN_FLOP] = 3;
        NEED_CARDS_AT_STATE[GameState.OPEN_TURN] = 1;
        NEED_CARDS_AT_STATE[GameState.OPEN_RIVER] = 1;
    }

    modifier costs(uint price) {
        require(msg.value >= gameFee, "msg.value should be more or equal than price");
        _;
    }

    modifier gameIsExist(uint256 gameId) {
        require(smallBlinds.length > gameId, "game with provided id should exist");
        _;
    }

    modifier gameStateEquals(GameState state, uint256 gameId) {
        require(gameState[gameId] == state, "action requires another game state");
        _;
    }

    modifier gameStateIsOpenCards(uint256 gameId) {
        require(gameState[gameId] == GameState.OPEN_FLOP
            || gameState[gameId] == GameState.OPEN_TURN
            || gameState[gameId] == GameState.OPEN_RIVER
            , "action requires another game state");
        _;
    }

    modifier gameStateIsTurn(uint256 gameId) {
        require(gameState[gameId] == GameState.PREFLOP
            || gameState[gameId] == GameState.FLOP
            || gameState[gameId] == GameState.TURN
            || gameState[gameId] == GameState.RIVER
            , "action requires another game state");
        _;
    }

    modifier actionExpectedFromPlayer(uint256 gameId) {
        require(actionExpectedFrom[gameId] == msg.sender, "game expects action from another player");
        _;
    }


    modifier canJoinGame(uint256 gameId) {
        require(gameState[gameId] == GameState.WAITING, "game has already started");
        for (uint i = 0; i < players[gameId].length; ++i) {
            require(players[gameId][i] != msg.sender, "msg.sender has aleardy joined the game");
        }
        uint position = players[gameId].length;
        if (position == SMALL_BLIND_POSITION % N_PLAYERS) {
            require(msg.value >= gameFee + smallBlinds[gameId], "need more money for smallBlind");
        }
        if (position == BIG_BLIND_POSITION % N_PLAYERS) {
            require(msg.value >= gameFee + 2 * smallBlinds[gameId], "need more money for bigBlind");
        }
        _;
    }

    function setGameFee(uint256 gameFee_) public onlyOwner {
        gameFee = gameFee_;
    }

    function setCipherModulo(uint256 cipherModulo_) public onlyOwner {
        cipherModulo = cipherModulo_;
    }

    function widthdraw(address _address, uint256 amount) public payable onlyOwner {
        payable(_address).transfer(amount);
    }

    function createGame() public payable costs(gameFee) returns(uint256) {
        uint256 newGameId = _gameCount.current();
        uint256 bigBlind = msg.value - gameFee;
        uint256 smallBlind = bigBlind / 2;
        smallBlinds.push(smallBlind);
        maxPot.push(0);
        winner.push(address(0));
        actionExpectedFrom.push(address(0));
        winnerRank.push(0);
        address[] memory newPlayers;
        players.push(newPlayers);

        uint256[] memory newPots;
        pots.push(newPots);

        uint256[N_PUBLIC_CARDS] memory newCards;
        publicCards.push(newCards);

        uint256[N_PUBLIC_CARDS] memory newCardsHashes;
        publicCardsHashes.push(newCardsHashes);

        uint256[N_PLAYERS][N_PRIVATE_CARDS] memory hashes;
        cardHashes.push(hashes);
        gameState.push(GameState.WAITING);
        enterGame(newGameId);
        return newGameId;
    }

    function enterGame(uint256 gameId) public payable
            gameIsExist(gameId)
            gameStateEquals(GameState.WAITING, gameId)
            canJoinGame(gameId) {
        uint position = players[gameId].length;
        player2position[gameId][msg.sender] = position;
        players[gameId].push(msg.sender);
        uint256 pot = 0;
        if (position == SMALL_BLIND_POSITION) {
            pot = smallBlinds[gameId];
        }
        if (position == BIG_BLIND_POSITION) {
            pot = 2 * smallBlinds[gameId];
        }
        if (pot > maxPot[gameId]) {
            maxPot[gameId] = pot;
        }
        pots[gameId].push(pot);

        if (players[gameId].length == N_PLAYERS) {
            gameState[gameId] = GameState.DEALING;
            actionExpectedFrom[gameId] = players[gameId][DEALER_POSITION];
        }
    }

    // DEALING:
    // based on http://people.csail.mit.edu/rivest/ShamirRivestAdleman-MentalPoker.pdf
    // first and second players have P1 and P2 reversable hashes based on discrete logarithms over same prime modulo
    // with properties P1(P2(x)) = P2(P1(x)) and P^(-1) (P(x)) = x
    // so first player creates permutation of hashes P_1 = P1(card1) ... P_N = P1(cardN),
    // second player chooses indicies j_1, j_2 and provides P2(P_j_2), P2(P_j_2)
    // after that first player provides their P1^(-1) P2(P_j_1), P1^(-1) P2(P_j_2) - cards for second player
    // also second player chooses two another indicies and provide this hashes P_i_1, P_i_2 - cards for first player
    function provideCardHashesForDealing(uint256 gameId, uint256 card1Hash, uint256 card2Hash) public
            gameIsExist(gameId)
            gameStateEquals(GameState.DEALING, gameId)
            actionExpectedFromPlayer(gameId) {
        uint nextPosition = (player2position[gameId][msg.sender] + 1) % N_PLAYERS;
        uint256[] memory nextPlayerHashes = new uint256[](N_PRIVATE_CARDS);
        nextPlayerHashes[0] = card1Hash;
        nextPlayerHashes[1] = card2Hash;
        require(cardHashes[gameId][nextPosition].length == N_PRIVATE_CARDS, "unexpected number of cardHashes");
        for (uint i = 0;i < N_PRIVATE_CARDS; ++i) {
            require(cardHashes[gameId][nextPosition][i] == 0);
            cardHashes[gameId][nextPosition][i] = nextPlayerHashes[i];
        }
        actionExpectedFrom[gameId] = players[gameId][nextPosition];

        if (nextPosition == DEALER_POSITION) {
            gameState[gameId] = GameState.PREFLOP;
        }
    }

    // PREFLOP
    // FLOP
    // TURN
    // RIVER
    function makeTurn(uint256 gameId, uint8 gameStateCode, uint8 actionTypeCode) public payable
            gameIsExist(gameId)
            gameStateEquals(GameState(gameStateCode), gameId)
            actionExpectedFromPlayer(gameId)
            gameStateIsTurn(gameId) {
        uint position = player2position[gameId][msg.sender];
        uint nextPosition = (position + 1) % N_PLAYERS;
        actionExpectedFrom[gameId] = players[gameId][nextPosition];

        ActionType action = ActionType(actionTypeCode);

        if (action == ActionType.FOLD) {
            gameState[gameId] = GameState.WINNER_CHOOSEN;
            actionExpectedFrom[gameId] =  players[gameId][nextPosition];
            return;
        }

        if (action == ActionType.RAISE) {
            require(msg.value + 2 * pots[gameId][position] >= 2 * maxPot[gameId],
                "Reraise should be at least the same as sum of previous raises at this round");
            maxPot[gameId] = msg.value + pots[gameId][position];
            return;
        }

        if (action == ActionType.CALL) {
            require(maxPot[gameId] <= pots[gameId][position] + msg.value);
            pots[gameId][position] = maxPot[gameId];
        }

        if (action == ActionType.CHECK) {
            require(maxPot[gameId] == pots[gameId][position],
                "Can't do check, action should be call/raise/fold");
        }

        if (nextPosition == DEALER_POSITION && maxPot[gameId] == pots[gameId][nextPosition]) {
            gameState[gameId] = GameState(gameStateCode + 1);
        }
    }

    // OPEN_FLOP
    // OPEN_TURN
    // OPEN_RIVER
    // Basic action - second player choose some hashes and supply them signed by first player,
    // also first player supply values of the hashes
    function openNextCards(
        uint256 gameId,
        uint256 gameStateCode,
        uint256[3] memory newCardHashes,
        uint256[3] memory newCards) public
            gameIsExist(gameId)
            gameStateEquals(GameState(gameStateCode), gameId)
            actionExpectedFromPlayer(gameId)
            gameStateIsOpenCards(gameId) {
        uint position = player2position[gameId][msg.sender];
        uint nextPosition = (position + 1) % N_PLAYERS;
        actionExpectedFrom[gameId] = players[gameId][nextPosition];

        if (position == DEALER_POSITION) {
            return;
        }

        updateCardInfo(gameId, gameStateCode, newCardHashes, newCards, nextPosition);
    }

    function updateCardInfo(
        uint256 gameId,
        uint256 gameStateCode,
        uint256[3] memory newCardHashes,
        uint256[3] memory newCards,
        uint nextPosition
    ) private {
        GameState state = gameState[gameId];
        uint needCards = NEED_CARDS_AT_STATE[state];
        uint offset = OPEN_CARDS_AT_STATE[state];
        uint256[] storage currentPublicCards = publicCards[gameId];
        uint256[] storage currentPublicCardsHashes = publicCardsHashes[gameId];
        for(uint i = 0;i < needCards; ++i) {
            uint pos = offset - 1 - i;
            currentPublicCards[pos] = newCards[i];
            currentPublicCardsHashes[pos] = newCardHashes[i];
        }

        if (nextPosition == DEALER_POSITION) {
            gameState[gameId] = GameState(gameStateCode + 1);
        }
    }

    // HANDSUP
    function submitKeys(uint256 gameId, uint256 privatePower, uint256 claimedHandCode, uint8 claimedCombination) public {
        uint position = player2position[gameId][msg.sender];
        uint nextPosition = (position + 1) % N_PLAYERS;
        actionExpectedFrom[gameId] = players[gameId][nextPosition];

        uint256[N_PRIVATE_CARDS] memory privateCards;
        for(uint i = 0; i < N_PRIVATE_CARDS; ++i) {
            privateCards[i] = PokerUtils.decipherCard(cardHashes[gameId][position][i], privatePower, cipherModulo);
        }
        uint256[N_PUBLIC_CARDS] memory gamePublicCards;
        for (uint i = 0;i < N_PUBLIC_CARDS; ++i) {
            gamePublicCards[i] = publicCards[gameId][i];
        }
        require(PokerUtils.checkClaimedHandWithPrivate(claimedHandCode, gamePublicCards, privateCards));
        require(PokerUtils.checkClaimedCombination(claimedHandCode, claimedCombination));
        uint256 currentRank = PokerUtils.calcHandRank(claimedHandCode, claimedCombination);
        if (currentRank > winnerRank[gameId]) {
            winnerRank[gameId] = currentRank;
            winner[gameId] = msg.sender;
        }
        if (nextPosition == DEALER_POSITION) {
            gameState[gameId] = GameState.WINNER_CHOOSEN;
            actionExpectedFrom[gameId] = winner[gameId];
        }
    }

    // WINNER_CHOOSEN
    function claimWin(uint256 gameId) public payable
            gameIsExist(gameId)
            gameStateEquals(GameState.WINNER_CHOOSEN, gameId)
            actionExpectedFromPlayer(gameId) {
        uint256 totalPot = 0;
        for (uint i = 0;i < N_PLAYERS; ++i) {
            totalPot += pots[gameId][i];
        }
        payable(msg.sender).transfer(totalPot);
    }
}


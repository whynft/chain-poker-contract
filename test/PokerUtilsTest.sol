// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/PokerUtils.sol";

contract PokerUtilsTest {
    function testCalcRankFromCombinationAndHand() public {
        uint256 numberOf5CardCombinations = 52 ** 5;
        Assert.equal(PokerUtils.calcHandRank(1, 0), 1, "wrong card rank");
        Assert.equal(PokerUtils.calcHandRank(0, 1), numberOf5CardCombinations, "wrong card rank");
        Assert.equal(PokerUtils.calcHandRank(1, 2), 2 * numberOf5CardCombinations + 1, "wrong card rank");
        Assert.equal(PokerUtils.calcHandRank(numberOf5CardCombinations - 1, 2),
            2 * numberOf5CardCombinations + (numberOf5CardCombinations - 1), "wrong card rank");
    }

//    function testCompareRanks() public {
//        uint256 combinationTwoPairs0 = makeCombinationIdFrom5CardHand(
//            [
//                makeCardIdFromPair([7, 0]),
//                makeCardIdFromPair([7, 2]),
//                makeCardIdFromPair([5, 0]),
//                makeCardIdFromPair([5, 1]),
//                makeCardIdFromPair([9, 3])
//            ]
//        );
//
//        uint256 combinationTwoPairs1 = makeCombinationIdFrom5CardHand(
//            [
//                makeCardIdFromPair([7, 1]),
//                makeCardIdFromPair([7, 2]),
//                makeCardIdFromPair([5, 0]),
//                makeCardIdFromPair([5, 1]),
//                makeCardIdFromPair([9, 3])
//            ]
//        );
//
//        uint256 combinationTwoPairs2 = makeCombinationIdFrom5CardHand(
//            [
//                makeCardIdFromPair([7, 1]),
//                makeCardIdFromPair([7, 2]),
//                makeCardIdFromPair([6, 0]),
//                makeCardIdFromPair([6, 1]),
//                makeCardIdFromPair([9, 3])
//            ]
//        );
//
//        uint256 combinationTwoPairs3 = makeCombinationIdFrom5CardHand(
//            [
//                makeCardIdFromPair([7, 1]),
//                makeCardIdFromPair([7, 2]),
//                makeCardIdFromPair([5, 0]),
//                makeCardIdFromPair([5, 1]),
//                makeCardIdFromPair([10, 3])
//            ]
//        );
//
//        Assert.equal(PokerUtils.calcHandRank(,2));
//    }

    function testCheckNCardsEqual() public {
        uint256 combinationSet = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([7, 1]),
                makeCardIdFromPair([7, 2]),
                makeCardIdFromPair([7, 0]),
                makeCardIdFromPair([3, 1]),
                makeCardIdFromPair([0, 3])
            ]
        );
        Assert.equal(PokerUtils.checkNCardsEqual(combinationSet, 3, 0), true, "expected set combination");
        Assert.equal(PokerUtils.checkNCardsEqual(combinationSet, 2, 1), true, "expected 2 and 3 cards are equal");
        Assert.equal(PokerUtils.checkNCardsEqual(combinationSet, 4, 0), false, "expected not quads combination");
    }

    function testCheckFlush() public {
        uint256 combinationFlush = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([7, 2]),
                makeCardIdFromPair([6, 2]),
                makeCardIdFromPair([1, 2]),
                makeCardIdFromPair([3, 2]),
                makeCardIdFromPair([0, 2])
            ]
        );

        uint256 combinationNotFlush = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([7, 1]),
                makeCardIdFromPair([7, 2]),
                makeCardIdFromPair([3, 2]),
                makeCardIdFromPair([4, 2]),
                makeCardIdFromPair([0, 2])
            ]
        );
        Assert.equal(PokerUtils.checkFlush(combinationFlush), true, "expected flush combination");
        Assert.equal(PokerUtils.checkFlush(combinationNotFlush), false, "expected not flush combination");
    }

    function testCheckStraight() public {
        uint256 combinationStraight = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([3, 2]),
                makeCardIdFromPair([4, 1]),
                makeCardIdFromPair([5, 0]),
                makeCardIdFromPair([6, 2]),
                makeCardIdFromPair([7, 3])
            ]
        );

        uint256 combinationNotStraight = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([9, 1]),
                makeCardIdFromPair([9, 2]),
                makeCardIdFromPair([10, 3]),
                makeCardIdFromPair([11, 2]),
                makeCardIdFromPair([12, 2])
            ]
        );
        Assert.equal(PokerUtils.checkStraight(combinationStraight), true, "expected straight combination");
        Assert.equal(PokerUtils.checkStraight(combinationNotStraight), false, "expected not straight combination");
    }

     function testCheckClaimedCombination() public {
         uint256 combinationHightCard = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([3, 2]),
                makeCardIdFromPair([4, 1]),
                makeCardIdFromPair([5, 0]),
                makeCardIdFromPair([6, 2]),
                makeCardIdFromPair([8, 3])
            ]
         );

         uint256 combinationOnePair = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([9, 1]),
                makeCardIdFromPair([9, 2]),
                makeCardIdFromPair([10, 3]),
                makeCardIdFromPair([11, 2]),
                makeCardIdFromPair([12, 2])
            ]
         );

         uint256 combinationTwoPairs = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([10, 1]),
                makeCardIdFromPair([10, 2]),
                makeCardIdFromPair([9, 3]),
                makeCardIdFromPair([9, 2]),
                makeCardIdFromPair([12, 2])
            ]
         );

         uint256 combinationSet = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([10, 1]),
                makeCardIdFromPair([10, 2]),
                makeCardIdFromPair([10, 3]),
                makeCardIdFromPair([9, 2]),
                makeCardIdFromPair([12, 2])
            ]
         );


         uint256 combinationStraight = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([3, 1]),
                makeCardIdFromPair([4, 2]),
                makeCardIdFromPair([5, 3]),
                makeCardIdFromPair([6, 2]),
                makeCardIdFromPair([7, 2])
            ]
         );

         uint256 combinationFlush = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([2, 3]),
                makeCardIdFromPair([3, 3]),
                makeCardIdFromPair([4, 3]),
                makeCardIdFromPair([6, 3]),
                makeCardIdFromPair([7, 3])
            ]
         );

         uint256 combinationFullHouse = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([3, 0]),
                makeCardIdFromPair([3, 3]),
                makeCardIdFromPair([3, 1]),
                makeCardIdFromPair([2, 2]),
                makeCardIdFromPair([2, 3])
            ]
         );

         uint256 combinationQuad = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([3, 0]),
                makeCardIdFromPair([3, 3]),
                makeCardIdFromPair([3, 1]),
                makeCardIdFromPair([3, 2]),
                makeCardIdFromPair([2, 3])
            ]
         );

         uint256 combinationStraightFlush = makeCombinationIdFrom5CardHand(
            [
                makeCardIdFromPair([2, 0]),
                makeCardIdFromPair([3, 0]),
                makeCardIdFromPair([4, 0]),
                makeCardIdFromPair([5, 0]),
                makeCardIdFromPair([6, 0])
            ]
         );

         uint256[9] memory allCombinations = [
            combinationHightCard,
            combinationOnePair,
            combinationTwoPairs,
            combinationSet,
            combinationStraight,
            combinationFlush,
            combinationFullHouse,
            combinationQuad,
            combinationStraightFlush
         ];

         Assert.equal(allCombinations.length, 9, "expect test covers all combinations");

         for (uint8 i = 0; i < allCombinations.length; ++i) {
             Assert.equal(
                 PokerUtils.checkClaimedCombination(allCombinations[i], i),
                     true,
                     "expected combination is not found"
             );
             for (uint8 j = i + 1; j < allCombinations.length; ++j) {
                 Assert.equal(
                     PokerUtils.checkClaimedCombination(allCombinations[i], j),
                         false,
                         "found unexpected combination which is higher"
                 );
             }
         }
    }


    function makeCardIdFromPair(uint8[2] memory cardParams) private pure returns(uint8) {
        return cardParams[0] * 4 + cardParams[1];
    }

    function makeCombinationIdFrom5CardHand(uint8[5] memory cards) private pure returns(uint256) {
        uint256 result = 0;
        for (uint i = 0;i < 5; ++i) {
            result *= 52;
            result += cards[4 - i];
        }
        return result;
    }
}
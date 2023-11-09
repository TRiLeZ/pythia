// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.13;

pragma experimental ABIEncoderV2;

import "../../accumulators/proto/curve/CurvePriceAccumulator.sol";

contract CurvePriceAccumulatorStub is CurvePriceAccumulator {
    constructor(
        IAveragingStrategy averagingStrategy_,
        address pool_,
        int8 nCoins_,
        address poolQuoteToken_,
        address ourQuoteToken_,
        uint256 updateTheshold_,
        uint256 minUpdateDelay_,
        uint256 maxUpdateDelay_
    )
        CurvePriceAccumulator(
            averagingStrategy_,
            pool_,
            nCoins_,
            poolQuoteToken_,
            ourQuoteToken_,
            updateTheshold_,
            minUpdateDelay_,
            maxUpdateDelay_
        )
    {}

    function harnessFetchPrice(address token) public view returns (uint112 price) {
        return super.fetchPrice(abi.encode(token));
    }

    function validateObservation(bytes memory, uint112) internal virtual override returns (bool) {
        return true; // Disable for simplicity
    }
}

// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.13;

pragma experimental ABIEncoderV2;

import "../../accumulators/proto/curve/CurveLiquidityAccumulator.sol";

contract CurveLiquidityAccumulatorStub is CurveLiquidityAccumulator {
    constructor(
        IAveragingStrategy averagingStrategy_,
        address pool_,
        uint8 nCoins_,
        address poolQuoteToken_,
        address ourQuoteToken_,
        uint8 decimals_,
        uint256 updateTheshold_,
        uint256 minUpdateDelay_,
        uint256 maxUpdateDelay_
    )
        CurveLiquidityAccumulator(
            averagingStrategy_,
            pool_,
            nCoins_,
            poolQuoteToken_,
            ourQuoteToken_,
            decimals_,
            updateTheshold_,
            minUpdateDelay_,
            maxUpdateDelay_
        )
    {}

    function harnessFetchLiquidity(
        address token
    ) public view returns (uint112 tokenLiquidity, uint112 quoteTokenLiquidity) {
        return super.fetchLiquidity(abi.encode(token));
    }

    function validateObservation(bytes memory, uint112, uint112) internal virtual override returns (bool) {
        return true; // Disable for simplicity
    }
}

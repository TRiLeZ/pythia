//SPDX-License-Identifier: MIT
pragma solidity  >=0.5 <0.8;

import "../interfaces/IDataSource.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol";
import "@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol";
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';

contract UniswapV3DataSource is IDataSource {

    uint32 immutable public observationPeriod;

    uint24 immutable public uniswapPoolFee;

    address immutable public uniswapFactory;

    address immutable private _baseToken;

    constructor(address uniswapFactory_, address baseToken_, uint24 uniswapPoolFee_, uint32 observationPeriod_) {
        uniswapFactory = uniswapFactory_;
        _baseToken = baseToken_;
        uniswapPoolFee = uniswapPoolFee_;
        observationPeriod = observationPeriod_;
    }

    function baseToken() override virtual public view returns (address) {
        return _baseToken;
    }

    function fetchPriceAndLiquidity(address token) override virtual public view returns(bool success, uint256 price, uint256 tokenLiquidity, uint256 baseLiquidity) {
        address poolAddress = PoolAddress.computeAddress(uniswapFactory, PoolAddress.getPoolKey(token, baseToken(), uniswapPoolFee));

        int24 timeWeightedAverageTick = OracleLibrary.consult(poolAddress, observationPeriod);

        price = OracleLibrary.getQuoteAtTick(timeWeightedAverageTick, uint128(10**(ERC20(token).decimals())), token, baseToken());

        uint128 liquidity = IUniswapV3Pool(poolAddress).liquidity();

        uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(timeWeightedAverageTick);
        uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(timeWeightedAverageTick + 1);

        uint256 amount0 = LiquidityAmounts.getAmount0ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity);
        uint256 amount1 = LiquidityAmounts.getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity);

        if (IUniswapV3Pool(poolAddress).token0() == token) {
            tokenLiquidity = amount0;
            baseLiquidity = amount1;
        } else {
            tokenLiquidity = amount1;
            baseLiquidity = amount0;
        }

        success = true;
    }

    function fetchPrice(address token) override virtual public view returns(bool success, uint256 price) {
        (success, price,,) = fetchPriceAndLiquidity(token);
    }

    function fetchLiquidity(address token) override virtual public view returns(bool success, uint256 tokenLiquidity, uint256 baseLiquidity) {
        (success,, tokenLiquidity, baseLiquidity) = fetchPriceAndLiquidity(token);
    }

}

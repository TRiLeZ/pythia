// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import "@uniswap/v3-core/contracts/libraries/TickMath.sol";

import "./LiquidityAmounts.sol";
import "./IAlgebraMintCallback.sol";
import "./PeripheryPayments.sol";
import "./PeripheryImmutableState.sol";
import "./IAlgebraPool.sol";
import "./PoolAddress.sol";

/// @title Liquidity management functions
/// @notice Internal functions for safely managing liquidity in Uniswap V3
abstract contract LiquidityManagement is IAlgebraMintCallback, PeripheryImmutableState, PeripheryPayments {
    struct MintCallbackData {
        address token0;
        address token1;
        address payer;
    }

    /// @inheritdoc IAlgebraMintCallback
    function algebraMintCallback(uint256 amount0Owed, uint256 amount1Owed, bytes calldata data) external override {
        MintCallbackData memory decoded = abi.decode(data, (MintCallbackData));
        // CallbackValidation.verifyCallback(factory, decoded.poolKey);

        if (amount0Owed > 0) pay(decoded.token0, decoded.payer, msg.sender, amount0Owed);
        if (amount1Owed > 0) pay(decoded.token1, decoded.payer, msg.sender, amount1Owed);
    }

    struct AddLiquidityParams {
        address token0;
        address token1;
        address recipient;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
    }

    /// @notice Add liquidity to an initialized pool
    function addLiquidity(
        AddLiquidityParams memory params
    ) internal returns (uint128 liquidity, uint256 amount0, uint256 amount1, IAlgebraPool pool) {
        pool = IAlgebraPool(
            PoolAddress.computeAddress(poolDeployer, PoolAddress.POOL_INIT_CODE_HASH, params.token0, params.token1)
        );

        // compute the liquidity amount
        {
            (uint160 sqrtPriceX96, , , , , , ) = pool.globalState();
            uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(params.tickLower);
            uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(params.tickUpper);

            liquidity = LiquidityAmounts.getLiquidityForAmounts(
                sqrtPriceX96,
                sqrtRatioAX96,
                sqrtRatioBX96,
                params.amount0Desired,
                params.amount1Desired
            );
        }

        bytes memory data = abi.encode(
            MintCallbackData({token0: params.token0, token1: params.token1, payer: msg.sender})
        );

        (amount0, amount1, ) = pool.mint(
            msg.sender,
            params.recipient,
            params.tickLower,
            params.tickUpper,
            liquidity,
            data
        );

        require(amount0 >= params.amount0Min && amount1 >= params.amount1Min, "Price slippage check");
    }
}

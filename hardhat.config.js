require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-tracer");
require("@atixlabs/hardhat-time-n-mine");
require("hardhat-contract-sizer");

const SOLC_8 = {
    version: "0.8.13",
    settings: {
        optimizer: {
            enabled: true,
            runs: 2000,
        },
    },
};

const SOLC_7 = {
    version: "0.7.6",
    settings: {
        optimizer: {
            enabled: true,
            runs: 2000,
        },
    },
};

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
        compilers: [SOLC_8, SOLC_7],
        overrides: {
            "@uniswap/v3-core/contracts/libraries/FixedPoint96.sol": SOLC_7,
            "@uniswap/v3-core/contracts/libraries/FullMath.sol": SOLC_7,
            "@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol": SOLC_7,
            "@uniswap/v3-core/contracts/libraries/TickMath.sol": SOLC_7,
            "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol": SOLC_7,
            "@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol": SOLC_7,
            "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol": SOLC_7,
            "@uniswap/v3-periphery/contracts/libraries/CallbackValidation.sol": SOLC_7,
            "@uniswap/v3-core/contracts/base/LiquidityManagement.sol": SOLC_7,
            "@uniswap/v3-core/contracts/base/PeripheryPayments.sol": SOLC_7,
            "@uniswap/v3-core/contracts/base/PeripheryImmutableState.sol": SOLC_7,
        },
    },
    networks: {
        hardhat: {
            gas: 10000000,
            hardfork: "berlin", // EIP 1559 leads to some gas cost issues with test cases
            forking: {
                url: "https://eth-mainnet.alchemyapi.io/v2/VCgYDancQJkTUUroC021s8qizSktMDQJ",
                //blockNumber: 13567142,
            },
            mining: {
                auto: true,
                mempool: {
                    order: "fifo",
                },
            },
            blockGasLimit: 20000000000,
            accounts: {
                accountsBalance: "1000000000000000000000000", // 1M ETH
            },
        },
    },
};

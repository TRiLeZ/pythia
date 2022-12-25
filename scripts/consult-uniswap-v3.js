// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const ethers = hre.ethers;

const uniswapV3FactoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const uniswapV3InitCodeHash = "0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54";

const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createContract(name, ...deploymentArgs) {
    const contractFactory = await ethers.getContractFactory(name);

    const contract = await contractFactory.deploy(...deploymentArgs);

    await contract.deployed();

    return contract;
}

async function createUniswapV3Oracle(factory, initCodeHash, quoteToken, period, granularity, liquidityDecimals) {
    const poolFees = [/*500, */ 3000 /*, 10000*/];

    const updateTheshold = 2000000; // 2% change -> update
    const minUpdateDelay = 5; // At least 5 seconds between every update
    const maxUpdateDelay = 60; // At most (optimistically) 60 seconds between every update

    const liquidityAccumulator = await createContract(
        "UniswapV3LiquidityAccumulator",
        factory,
        initCodeHash,
        poolFees,
        quoteToken,
        liquidityDecimals,
        updateTheshold,
        minUpdateDelay,
        maxUpdateDelay
    );

    const priceAccumulator = await createContract(
        "UniswapV3PriceAccumulator",
        factory,
        initCodeHash,
        poolFees,
        quoteToken,
        updateTheshold,
        minUpdateDelay,
        maxUpdateDelay
    );

    const oracle = await createContract(
        "PeriodicAccumulationOracle",
        liquidityAccumulator.address,
        priceAccumulator.address,
        quoteToken,
        period,
        granularity
    );

    return {
        liquidityAccumulator: liquidityAccumulator,
        priceAccumulator: priceAccumulator,
        oracle: oracle,
    };
}

async function main() {
    const token = wethAddress;
    const quoteToken = usdcAddress;

    const underlyingPeriodSeconds = 5;
    const granularity = 1;

    const liquidityDecimals = 4;

    const uniswapV3 = await createUniswapV3Oracle(
        uniswapV3FactoryAddress,
        uniswapV3InitCodeHash,
        quoteToken,
        underlyingPeriodSeconds,
        granularity,
        liquidityDecimals
    );

    const tokenContract = await ethers.getContractAt("ERC20", token);
    const quoteTokenContract = await ethers.getContractAt("ERC20", quoteToken);

    const tokenSymbol = await tokenContract.symbol();
    const quoteTokenSymbol = await quoteTokenContract.symbol();

    const tokenDecimals = await tokenContract.decimals();
    const quoteTokenDecimals = await quoteTokenContract.decimals();

    const updateData = ethers.utils.hexZeroPad(token, 32);

    while (true) {
        try {
            if (await uniswapV3.liquidityAccumulator.canUpdate(updateData)) {
                const [tokenLiquidity, quoteTokenLiquidity] = await uniswapV3.liquidityAccumulator[
                    "consultLiquidity(address,uint256)"
                ](token, 0);

                const laUpdateData = ethers.utils.defaultAbiCoder.encode(
                    ["address", "uint", "uint"],
                    [token, tokenLiquidity, quoteTokenLiquidity]
                );

                const updateTx = await uniswapV3.liquidityAccumulator.update(laUpdateData);
                const updateReceipt = await updateTx.wait();

                console.log(
                    "\u001b[" +
                        93 +
                        "m" +
                        "Liquidity accumulator updated. Gas used = " +
                        updateReceipt["gasUsed"] +
                        "\u001b[0m"
                );
            }

            if (await uniswapV3.priceAccumulator.canUpdate(updateData)) {
                const price = await uniswapV3.priceAccumulator["consultPrice(address,uint256)"](token, 0);

                const paUpdateData = ethers.utils.defaultAbiCoder.encode(["address", "uint"], [token, price]);

                const updateTx = await uniswapV3.priceAccumulator.update(paUpdateData);
                const updateReceipt = await updateTx.wait();

                console.log(
                    "\u001b[" +
                        93 +
                        "m" +
                        "Price accumulator updated. Gas used = " +
                        updateReceipt["gasUsed"] +
                        "\u001b[0m"
                );
            }

            if (await uniswapV3.oracle.canUpdate(updateData)) {
                const updateTx = await uniswapV3.oracle.update(updateData);
                const updateReceipt = await updateTx.wait();

                console.log(
                    "\u001b[" + 93 + "m" + "Oracle updated. Gas used = " + updateReceipt["gasUsed"] + "\u001b[0m"
                );
            }

            const consultation = await uniswapV3.oracle["consult(address)"](token);

            const priceStr = ethers.utils.commify(ethers.utils.formatUnits(consultation["price"], quoteTokenDecimals));

            console.log(
                "\u001b[" + 32 + "m" + "Price(%s) = %s %s" + "\u001b[0m",
                tokenSymbol,
                priceStr,
                quoteTokenSymbol
            );

            const tokenLiquidityStr = ethers.utils.commify(consultation["tokenLiquidity"]);

            const quoteTokenLiquidityStr = ethers.utils.commify(consultation["quoteTokenLiquidity"]);

            console.log(
                "\u001b[" + 31 + "m" + "Liquidity(%s) = %s, Liquidity(%s) = %s" + "\u001b[0m",
                tokenSymbol,
                tokenLiquidityStr,
                quoteTokenSymbol,
                quoteTokenLiquidityStr
            );
        } catch (e) {
            console.log(e);
        }

        await sleep(1000);

        // Keep mining blocks so that block.timestamp updates
        await hre.network.provider.send("evm_mine");
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

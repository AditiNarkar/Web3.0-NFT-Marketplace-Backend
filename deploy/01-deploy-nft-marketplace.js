const { network } = require("hardhat")
const { devChains } = require("../helper-hardhat-config.js")
const { verify } = require("../utils/verify.js")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(` NFT Marketplace deployer: ${deployer}`)

    log("Deploying NFT Marketplace...")
    const args = []
    let NFT_Marketplace
    console.log("Network: ", network.name )
    if (devChains.includes(network.name)) {
        NFT_Marketplace = await deploy("NFT_Marketplace", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: network.config.blockConfirmations || 1,
            maxFeePerGas: 24327963402, // -> for devChains
        })
    }
    else {
        NFT_Marketplace = await deploy("NFT_Marketplace", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: network.config.blockConfirmations || 1,
        })
    }



    if (!devChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying...")
        await verify(NFT_Marketplace.address, args)
    }
    console.log("--------------------")
}

module.exports.tags = ["all", "nftmarketplace"] // important for deployments.fixture
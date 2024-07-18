require("dotenv").config()
const fs = require("fs")
const { network } = require("hardhat")

const frontEndContractsFile = "../frontend-nft-marketplace-thegraph/frontend-nft-marketplace/constants/networkMapping.json";
const frontEndAbiLocation = "../frontend-nft-marketplace-thegraph/frontend-nft-marketplace/constants/"
// const frontEndAbiLocation2 = "../frontend-nft-marketplace-thegraph/frontend-nft-marketplace/constants/"

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Front end written!")
    }
}

async function updateAbi() {
    const myContract = await deployments.get("NFT_Marketplace")
    const nftMarketplace = await ethers.getContractAt(
        myContract.abi,
        myContract.address
    )
    fs.writeFileSync(
        `${frontEndAbiLocation}NftMarketplace.json`, JSON.stringify(nftMarketplace.interface.format("json"))
        // nftMarketplace.interface.format(ethers.FormatTypes.json)
    )
    // fs.writeFileSync(
    //     `${frontEndAbiLocation2}NftMarketplace.json`,
    //     nftMarketplace.interface.format(ethers.utils.FormatTypes.json)
    // )

    const myContract2 = await deployments.get("BasicNFT")
    const basicNft = await ethers.getContractAt(
        myContract2.abi,
        myContract2.address
    )
    fs.writeFileSync(
        `${frontEndAbiLocation}BasicNft.json`, JSON.stringify(basicNft.interface.format("json"))
        // basicNft.interface.format(ethers.FormatTypes.json)
    )
    // fs.writeFileSync(
    //     `${frontEndAbiLocation2}BasicNft.json`,
    //     basicNft.interface.format(ethers.utils.FormatTypes.json)
    // )
}

async function updateContractAddresses() {
    const chainId = network.config.chainId.toString()
    const myContract = await deployments.get("NFT_Marketplace")
    const nftMarketplace = await ethers.getContractAt(
        myContract.abi,
        myContract.address
    )
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["NftMarketplace"].includes(nftMarketplace.target)) {
            contractAddresses[chainId]["NftMarketplace"].push(nftMarketplace.target)
        }
    } else {
        contractAddresses[chainId] = { NftMarketplace: [nftMarketplace.target] }
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
    // fs.writeFileSync(frontEndContractsFile2, JSON.stringify(contractAddresses))
}
module.exports.tags = ["all", "frontend"]
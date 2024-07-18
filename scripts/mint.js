const { deployments, ethers } = require("hardhat")

const PRICE = ethers.parseEther("0.01")

async function mint() {
    const myContract = await deployments.get("NFT_Marketplace")
    const NFT_Marketplace = await ethers.getContractAt(
        myContract.abi,
        myContract.address
    )

    const myContract2 = await deployments.get("BasicNFT")
    const basicNftContract = await ethers.getContractAt(
        myContract2.abi,
        myContract2.address
    )

    console.log("Minting ...")
    const basicNFTtx = await basicNftContract.mintNFT()
    const basicNftReciept = await basicNFTtx.wait(1)

    const tokenId = basicNftReciept.logs[0].args.tokenId
    console.log("tokenId: ", tokenId)
    console.log("NFT_ADDRESS: ", NFT_Marketplace.target)
    console.log("basicNftContract: ", basicNftContract.target)


    console.log("Approving NFT...")
    const approveTx = await basicNftContract.approve(NFT_Marketplace.target, tokenId)
    await approveTx.wait(1)

    console.log("Listing...")
    const listTx = await NFT_Marketplace.listItem(basicNftContract.target, tokenId, PRICE)
    await listTx.wait(1)
    console.log("Listed.")
}

mint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { devChains } = require("../../helper-hardhat-config")

console.log("network:", network.name)

!devChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", function () {
        let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract
        const PRICE = ethers.parseEther("0.1")
        const TOKEN_ID = 0

        beforeEach(async () => {
            accounts = await ethers.getSigners() // could also do with getNamedAccounts
            deployer = accounts[0]
            console.log("deployer: ", deployer.address)
            user = accounts[1]
            console.log("user: ", user.address)
            
            await deployments.fixture(["all"])

            const myContract = await deployments.get("NFT_Marketplace")
            nftMarketplaceContract = await ethers.getContractAt(
                myContract.abi,
                myContract.address
            )
            nftMarketplace = nftMarketplaceContract.connect(deployer)

            const myContract2 = await deployments.get("BasicNFT")
            basicNftContract = await ethers.getContractAt(
                myContract2.abi,
                myContract2.address
            )
            basicNft = basicNftContract.connect(deployer)

            await basicNft.mintNFT()
            await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID)
        })

        describe("listItem", function () {
            it("emits an event after listing an item", async function () {
                expect(await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                    "ItemListed"
                )
            })
            it("exclusively items that haven't been listed", async function () {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const error = `AlreadyListed("${basicNft.address}", ${TOKEN_ID})`
                await expect(
                    nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                ).to.be.revertedWith(error)
            })
            it("exclusively allows owners to list", async function () {
                nftMarketplace = nftMarketplaceContract.connect(user)
                await basicNft.approve(user.address, TOKEN_ID)
                await expect(
                    nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                ).to.be.revertedWith("NFT_Marketplace__OwnerAccessDenied")
            })
            it("needs approvals to list item", async function () {
                await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                await expect(
                    nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                ).to.be.revertedWith("NFT_Marketplace__NotApprovedForMarketplace")
            })
            it("Updates listing with seller and price", async function () {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                assert(listing.price.toString() == PRICE.toString())
                assert(listing.seller.toString() == deployer.address)
            })
            it("reverts if the price be 0", async () => {
                const ZERO_PRICE = ethers.utils.parseEther("0")
                await expect(
                    nftMarketplace.listItem(basicNft.address, TOKEN_ID, ZERO_PRICE)
                ).revertedWithCustomError(nftMarketplace, "NftMarketplace__PriceMustBeAboveZero")
            })
        })
        describe("cancelListing", function () {
            it("reverts if there is no listing", async function () {
                const error = `NotListed("${basicNft.address}", ${TOKEN_ID})`
                await expect(
                    nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                ).to.be.revertedWith(error)
            })
            it("reverts if anyone but the owner tries to call", async function () {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                await basicNft.approve(user.address, TOKEN_ID)
                await expect(
                    nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                ).to.be.revertedWith("NotOwner")
            })
            it("emits event and removes listing", async function () {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                expect(await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.emit(
                    "ItemCanceled"
                )
                const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                assert(listing.price.toString() == "0")
            })
        })
        describe("buyItem", function () {
            it("reverts if the item isnt listed", async function () {
                await expect(
                    nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                ).to.be.revertedWith("NotListed")
            })
            it("reverts if the price isnt met", async function () {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                await expect(
                    nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                ).to.be.revertedWith("PriceNotMet")
            })
            it("transfers the nft to the buyer and updates internal Earnings record", async function () {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                expect(
                    await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                ).to.emit("ItemBought")
                const newOwner = await basicNft.ownerOf(TOKEN_ID)
                const deployerEarnings = await nftMarketplace.getEarnings(deployer.address)
                assert(newOwner.toString() == user.address)
                assert(deployerEarnings.toString() == PRICE.toString())
            })
        })
        describe("updateListing", function () {
            it("must be owner and listed", async function () {
                await expect(
                    nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                ).to.be.revertedWith("NotListed")
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                await expect(
                    nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                ).to.be.revertedWith("NotOwner")
            })
            it("reverts if new price is 0", async function () {
                const updatedPrice = ethers.utils.parseEther("0")
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                await expect(nftMarketplace.updateListing(basicNft.address, TOKEN_ID, updatedPrice)).to.be.revertedWith("PriceMustBeAboveZero")
            })
            it("updates the price of the item", async function () {
                const updatedPrice = ethers.utils.parseEther("0.2")
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                expect(
                    await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, updatedPrice)
                ).to.emit("ItemListed")
                const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                assert(listing.price.toString() == updatedPrice.toString())
            })
        })
        describe("withdrawEarnings", function () {
            it("doesn't allow 0 proceed withdrawls", async function () {
                await expect(nftMarketplace.withdrawEarnings()).to.be.revertedWith("NoEarnings")
            })
            it("withdraws Earnings", async function () {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                nftMarketplace = nftMarketplaceContract.connect(deployer)

                const deployerEarningsBefore = await nftMarketplace.getEarnings(deployer.address)
                const deployerBalanceBefore = await deployer.getBalance()
                const txResponse = await nftMarketplace.withdrawEarnings()
                const transactionReceipt = await txResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const deployerBalanceAfter = await deployer.getBalance()

                assert(
                    deployerBalanceAfter.add(gasCost).toString() ==
                    deployerEarningsBefore.add(deployerBalanceBefore).toString()
                )
            })
        })
    })
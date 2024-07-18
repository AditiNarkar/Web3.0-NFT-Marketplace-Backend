// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error NFT_Marketplace__PriceMustBeAboveZero();
error NFT_Marketplace__NotApprovedForMarketplace();
error NFT_Marketplace__AlreadyListed(address NFTaddress, uint256 tokenId);
error NFT_Marketplace__NotListed(address NFTaddress, uint256 tokenId);
error NFT_Marketplace__OwnerAccessDenied();
error NFT_Marketplace__PriceNotMet(
    address NFTaddress,
    uint256 tokenId,
    uint256 price
);
error NFT_Marketplace__NoEarnings();
error NFT_Marketplace__WithdrawFailed();

contract NFT_Marketplace {
    // data types
    struct Listing {
        uint256 price;
        address owner;
    }
    // NFT Contract address -> NFT TokenID -> a
    mapping(address => mapping(uint256 => Listing)) private s_listings;

    // Owner -> earnings
    mapping(address => uint256) private s_earnings;

    //events
    event ItemListed(
        address indexed owner,
        address indexed NFTaddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event ItemBought(
        address indexed buyer,
        address indexed NFTaddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event ItemCancelled(
        address indexed buyer,
        address indexed NFTaddress,
        uint256 indexed tokenId
    );

    //modifiers
    modifier notListed(address NFTaddress, uint256 tokenId) {
        Listing memory listing = s_listings[NFTaddress][tokenId];
        if (listing.price > 0) {
            revert NFT_Marketplace__AlreadyListed(NFTaddress, tokenId);
        }
        _; // rest of the code
    }

    modifier isListed(address NFTaddress, uint256 tokenId) {
        Listing memory listing = s_listings[NFTaddress][tokenId];
        if (listing.price <= 0) {
            revert NFT_Marketplace__NotListed(NFTaddress, tokenId);
        }
        _; // rest of the code
    }

    modifier ownerAccess(
        address NFTaddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 NFT = IERC721(NFTaddress);
        address owner = NFT.ownerOf(tokenId);
        if (spender != owner) {
            revert NFT_Marketplace__OwnerAccessDenied();
        }
        _; // rest of the code
    }

    ////////////////
    ///Functionss///
    ////////////////
    function listItem(
        address NFTaddress,
        uint256 tokenId,
        uint256 price
    )
        external
        ownerAccess(NFTaddress, tokenId, msg.sender)
        notListed(NFTaddress, tokenId)
    {
        if (price <= 0) {
            revert NFT_Marketplace__PriceMustBeAboveZero();
        }
        // Transfer NFT to contract -> "hold"
        // Owners can still hold NFT, give marketplace approval to sell for them.
        IERC721 NFT = IERC721(NFTaddress);
        if (NFT.getApproved(tokenId) != address(this)) {
            revert NFT_Marketplace__NotApprovedForMarketplace();
        }
        s_listings[NFTaddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, NFTaddress, tokenId, price);
    }

    function buyItem(
        address NFTaddress,
        uint256 tokenId
    ) external payable isListed(NFTaddress, tokenId) {
        Listing memory listedItem = s_listings[NFTaddress][tokenId];
        if (msg.value < listedItem.price) {
            revert NFT_Marketplace__PriceNotMet(
                NFTaddress,
                tokenId,
                listedItem.price
            );
        }
        // send money to user ❌
        // have them withdraw ✅
        s_earnings[listedItem.owner] = s_earnings[listedItem.owner] + msg.value;
        delete (s_listings[NFTaddress][tokenId]);
        IERC721(NFTaddress).safeTransferFrom(
            listedItem.owner,
            msg.sender,
            tokenId
        );

        emit ItemBought(msg.sender, NFTaddress, tokenId, listedItem.price);
    }

    function cancelItem(
        address NFTaddress,
        uint256 tokenId
    )
        external
        ownerAccess(NFTaddress, tokenId, msg.sender)
        isListed(NFTaddress, tokenId)
    {
        delete (s_listings[NFTaddress][tokenId]);
        emit ItemCancelled(msg.sender, NFTaddress, tokenId);
    }

    function updateListing(
        address NFTaddress,
        uint256 tokenId,
        uint256 newprice
    )
        external
        ownerAccess(NFTaddress, tokenId, msg.sender)
        notListed(NFTaddress, tokenId)
    {
        s_listings[NFTaddress][tokenId] = Listing(newprice, msg.sender);
        emit ItemListed(msg.sender, NFTaddress, tokenId, newprice);
    }

    function withdrawEarnings() external {
        uint256 earnings = s_earnings[msg.sender];
        if (earnings <= 0) {
            revert NFT_Marketplace__NoEarnings();
        }
        s_earnings[msg.sender] = 0; // resetting before "call" is important be be safe from fallback attacks

        (bool succes, ) = payable(msg.sender).call{value: earnings}("");

        if (!succes) {
            revert NFT_Marketplace__WithdrawFailed();
        }
    }

    ////////////////
    /// Getter Functionss///
    ////////////////
    function getListing(address NFTaddress, uint256 tokenId) external view returns(Listing memory){
        return s_listings[NFTaddress][tokenId];
    }

    function getEarnings(address owner) external view returns(uint256){
        return s_earnings[owner];
    }

    
}

# DAO Voting System
​
In this project you're going to write a governance smart contract for a decentralized autonomous organization (DAO) aimed at buying valuable NFTs. In doing so, you will:
​
- Implement a treasury contract that buys NFTs
- Implement a voting system with signature votes
- Implement a proposal system that calls arbitrary functions.
​
## Project Spec
​
You are writing a contract for Collector DAO, a DAO that aims to collect rare NFTs. This DAO wishes to have a contract that:
​
- Allows anyone to buy a membership for 1 ETH
- Allows a member to propose an NFT to buy
- Allows members to vote on proposals:
  - With a 25% quorum
- If passed, have the contract purchase the NFT in a reasonably automated fashion.
​
Implementation requirements:
​
- Even though this DAO has one main purpose, write your proposal system to support calling arbitrary functions, then use this to implement the NFT-buying behavior.
- Write a function that accepts, validates, and writes vote signatures. Then write a function to do this in bulk.
​
Here is the interface you can assume exists for buying NFTs:
​
```
interface NftMarketplace {
    function getPrice(address nftContract, uint nftId) external returns (uint price);
    function buy(address nftContract, uint nftId) external payable returns (bool success);
}
```
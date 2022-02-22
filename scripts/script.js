const hre = require("hardhat");
const { ethers } = require("hardhat");

const main = async () => {
  const [deployer] = await ethers.getSigners();
  const transactionsFactory = await hre.ethers.getContractFactory("AcroDAO", deployer);
  const transactionsContract = await transactionsFactory.deploy(true);
  await transactionsContract.deployed();
  console.log("AcroDAO address: ", transactionsContract.address);
  console.log("deployer address: ", deployer.address);
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

runMain();
//npx hardhat run scripts/deploy.js --network ropsten
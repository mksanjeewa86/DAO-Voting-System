const { expect } = require("chai");
const { ethers } = require("hardhat");
const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/dist/src/signer-with-address");

describe("Project", () => {
  let account1 =  SignerWithAddress;
  let account2 =  SignerWithAddress;

  beforeEach(async () => {
    const [address1, address2] = await ethers.getSigners();
    account1 = address1;
    account2 = address2;
  });

  const deployProject = async () => {
    const contractFactory = await ethers.getContractFactory("AcroDAO");
    const contract = await contractFactory.deploy();
    await contract.deployed();
    return contract;
  };

  describe("state variables", () => {
    it("should be account owner", async () => {
      await deployProject();
    });
  });
});
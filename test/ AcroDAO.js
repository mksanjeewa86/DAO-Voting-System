const { expect } = require("chai");
const { ethers } = require("hardhat");
const { utils, BigNumber } = ethers;
const { provider } = waffle;
const { parseEther, randomBytes, keccak256 } = utils;
const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/dist/src/signer-with-address");
const abiCoder = new utils.AbiCoder();
const sinon = require("sinon");

describe("Project", () => {
  let account1 =  SignerWithAddress;
  let account2 =  SignerWithAddress;
  let project;

  const deployDAO = async () => {
    const contractFactory = await ethers.getContractFactory("AcroDAO");
    const contract = await contractFactory.deploy();
    await contract.deployed();
    return contract;
  };

  const deployMarketplace = async () => {
    const contractFactory = await ethers.getContractFactory("NftMarketplace");
    const contract = await contractFactory.deploy();
    await contract.deployed();
    return contract;
  };

  beforeEach(async () => {
    const [address1, address2] = await ethers.getSigners();
    account1 = address1;
    account2 = address2;
    project = await deployDAO();
  });

  describe("get membership", () => {
    it("should be return as a member", async () => {
      await project.connect(account2).getMembership({ value: parseEther("1") });
      const membership = await project.returnMembership(account2.address);
      expect(membership).to.equal(true);
    });
    it("should revert with error", async () => {
      await expect(project.connect(account2).getMembership({ value: parseEther("0.9") })
      ).to.be.revertedWith("should 1 ether");
    });
    it("should revert with error multiple membership", async () => {
      await project.connect(account2).getMembership({ value: parseEther("1") });
      await expect(project.connect(account2).getMembership({ value: parseEther("1") })
      ).to.be.revertedWith("already member");
    });
  });
  describe("propose", () => {
    beforeEach(async () => {
      await project.connect(account2).getMembership({ value: parseEther("1") });
    });
    it("should create a project", async () => {
      const market = await deployMarketplace();
      const proposal = {
        targets: [market.address],
        values: [parseEther("1")],
        signatures: ["buyNFT(uint id, uint value)"],
        calldatas: [randomBytes(64)],
        description: "buy rare NFTs",
      };
      await expect(
        project.connect(account2).propose(
          proposal.targets,
          proposal.values,
          proposal.signatures,
          proposal.calldatas,
          proposal.description
        ),
      ).to.emit(project, "ProposalCreate");
      const proposalId = await project.latestId(account2.address);
      const newProposal = await project.proposals(proposalId);
      expect(newProposal.votes.againstVotes).to.equal(0);
      expect(newProposal.votes.forVotes).to.equal(0);
      expect(newProposal.votes.abstainVotes).to.equal(0);
      const state = await project.returnProposalState(proposalId);
      expect(state).to.equal(0);
    });
    it("should not create proposal other than member", async () => {
      const market = await deployMarketplace();
      const proposal = {
        targets: [market.address],
        values: [parseEther("1")],
        signatures: ["buyNFT(uint id, uint value)"],
        calldatas: [randomBytes(64)],
        description: "buy rare NFTs",
      };
      await expect(
        project.connect(account1).propose(
          proposal.targets,
          proposal.values,
          proposal.signatures,
          proposal.calldatas,
          proposal.description
        ),
      ).to.be.revertedWith("members only");
    });
  });
  describe("cast vote", () => {
    let proposalId;
    let types;
    let domain;
    let market;
    beforeEach(async () => {
      await project.connect(account2).getMembership({ value: parseEther("1") });
      market = await deployMarketplace();
      const proposal = {
        targets: [market.address],
        values: [parseEther("1")],
        signatures: ["buyNFT(uint id, uint value)"],
        calldatas: [randomBytes(64)],
        description: "buy rare NFTs",
      };
      await project.connect(account2).propose(
        proposal.targets,
        proposal.values,
        proposal.signatures,
        proposal.calldatas,
        proposal.description
      );
      proposalId = await project.latestId(account2.address);
      types = {
        Ballot: [
          { name: "proposalId", type: "uint256" },
          { name: "support", type: "uint8" },
        ],
      };
      domain = {
        name: await project.name(),
        chainId: (await provider.getNetwork()).chainId,
        verifyingContract: project.address,
      };
    });
    it("should cast for vote", async () => {
      const message = {
        proposalId: BigNumber.from(proposalId),
        support: 1,
      };
      const signature = await account2._signTypedData(domain, types, message);
      const { v, r, s } = ethers.utils.splitSignature(signature);
      await project.castVote(proposalId, 1, v, r, s);
      const { againstVotes, forVotes, abstainVotes } = await project.returnVotes(proposalId);
      expect(againstVotes).to.equal(0);
      expect(forVotes).to.equal(1);
      expect(abstainVotes).to.equal(0);
    });
    it("should cast againt vote", async () => {
      const message = {
        proposalId: BigNumber.from(proposalId),
        support: 0,
      };
      const signature = await account2._signTypedData(domain, types, message);
      const { v, r, s } = ethers.utils.splitSignature(signature);
      await project.connect(account2).castVote(proposalId, 0, v, r, s);
      const { againstVotes, forVotes, abstainVotes } = await project.returnVotes(proposalId);
      expect(againstVotes).to.equal(1);
      expect(forVotes).to.equal(0);
      expect(abstainVotes).to.equal(0);
    });
    it("should not allow more than once", async () => {
      const message1 = {
        proposalId: BigNumber.from(proposalId),
        support: 1,
      };
      const message2 = {
        proposalId: BigNumber.from(proposalId),
        support: 1,
      };
      const signature1 = await account2._signTypedData(domain, types, message1);
      const signature2 = await account2._signTypedData(domain, types, message2);
      const { v: v1, r: r1, s: s1 } = ethers.utils.splitSignature(signature1);
      const { v: v2, r: r2, s: s2 } = ethers.utils.splitSignature(signature2);
      await project.castVote(proposalId, 1, v1, r1, s1);
      await expect(project.castVote(proposalId, 1, v2, r2, s2)
      ).to.be.revertedWith("already voted");
    });
    it("should fail if vote is change", async () => {
      const message = {
        proposalId: BigNumber.from(proposalId),
        support: 1,
      };
      const signature = await account2._signTypedData(domain, types, message);
      const { v, r, s } = ethers.utils.splitSignature(signature);
      await expect(project.castVote(proposalId, 0, v, r, s)
      ).to.be.revertedWith("not a member");
    });
    it("should fail if proposal id is changed", async () => {
      await project.connect(account1).getMembership({ value: parseEther("1") });
      const proposal2 = {
        targets: [market.address],
        values: [parseEther("2")],
        signatures: ["buyNFT(uint id, uint value)"],
        calldatas: [randomBytes(64)],
        description: "buy rare NFTs",
      };
      await project.connect(account1).propose(
        proposal2.targets,
        proposal2.values,
        proposal2.signatures,
        proposal2.calldatas,
        proposal2.description
      );
      proposalId2 = await project.latestId(account1.address);
      const message = {
        proposalId: BigNumber.from(proposalId),
        support: 1,
      };
      const signature = await account1._signTypedData(domain, types, message);
      const { v, r, s } = ethers.utils.splitSignature(signature);
      await expect(project.connect(account2).castVote(proposalId2, 1, v, r, s)
      ).to.be.revertedWith("not a member");
    });
  });
  describe("execute", () => {
    it("sample", async () => {
      let proposalId;
      let proposalContract;
      let marketplaceContract;
      let types;
      let domain;
      let clock;
      clock = sinon.useFakeTimers({
        now: new Date().getTime(),
        toFake: ["Date"],
      });
      const ONE_DAY = 60 * 1000 * 60 * 24;
      const accounts = await ethers.getSigners();
      proposalContract = await deployDAO();
      marketplaceContract = await deployMarketplace();
      await marketplaceContract.connect(account1).addNftContract([
        [0, parseEther("1")],
        [1, parseEther("2")],
      ]);
      const proposal = {
        targets: [proposalContract.address],
        values: [parseEther("1")],
        signatures: ["buyNft(uint256,uint256)"],
        calldatas: [abiCoder.encode(["uint256", "uint256"], [0, 0])],
        description: "Buy a rare nfts",
      };
      accounts.slice(0, 19).map(async account => {
        await project.connect(account).getMembership({ value: parseEther("1") });
      });
      await project.connect(account1).propose(
        proposal.targets,
        proposal.values,
        proposal.signatures,
        proposal.calldatas,
        proposal.description
      );
      proposalId = await project.latestId(account1.address);
      types = {
        Ballot: [
          { name: "proposalId", type: "uint256" },
          { name: "support", type: "uint8" },
        ],
      };
      domain = {
        name: await project.name(),
        chainId: (await provider.getNetwork()).chainId,
        verifyingContract: project.address,
      };
      accounts.slice(0, 15).map(async (account, idx) => {
        const message = {
          proposalId: BigNumber.from(proposalId),
          support: idx < 10 ? 1 : 0,
        };
        const signature = await account._signTypedData(domain, types, message);
        const { v, r, s } = ethers.utils.splitSignature(signature);
        await project.castVote(message.proposalId, message.support, v, r, s);
      });
      const { againstVotes, forVotes, abstainVotes } = await project.returnVotes(proposalId);
      expect(againstVotes).to.equal(5);
      expect(forVotes).to.equal(10);
      expect(abstainVotes).to.equal(0);
      clock.tick(ONE_DAY * 7);
      await project.executeProposal(proposalId);
      expect(await marketplaceContract.getOwner(0, 0)).to.equal(account1.address);
    });
  });
});
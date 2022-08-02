const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lottery", function () {
  let lotteryContract, accounts, nextWeek;
  
  describe("Deployment", function () {
    it("Deploys", async function () {
      const Lottery = await ethers.getContractFactory("Lottery");
      accounts = await ethers.getSigners();
      nextWeek = Math.floor(Date.now() / 1000) + 604800;
      lotteryContract = await Lottery.deploy(nextWeek);
      expect(await lotteryContract.deployed()).to.be.ok;
    });

    it("Has the correct endTime", async function () {
      let endTime = await lotteryContract.endTime();
      expect(endTime).to.be.closeTo(Math.floor(Date.now() / 1000) + 604800, 5);
    });
  });

  describe("Lottery is open", function () {
    it("Users enter between 1-3", async function () {
      for (let account of accounts) {
        let randomNumber = Math.floor(Math.random() * 3);
        await lotteryContract
          .connect(account)
          .enter(randomNumber, { value: ethers.utils.parseEther("0.0001") });
        const entries = await lotteryContract.getEntriesForNumber(randomNumber, 1);
        expect(entries).to.include(account.address);
      }
    });

    it("Should fail if entry is invalid", async function () {
      await expect(
        lotteryContract
          .connect(accounts[0])
          .enter(4, { value: ethers.utils.parseEther("0.02") })
      ).to.be.reverted; // exact ticket price only
      await expect(
        lotteryContract
          .connect(accounts[0])
          .enter(65539, { value: ethers.utils.parseEther("0.01") })
      ).to.be.reverted; // number too high
    });

    it("Should fail to close lotteryContract if week is still open", async function () {
      await expect(lotteryContract.connect(accounts[0]).closeWeek(55)).to.be.reverted;
    });
  });

  describe("First week ends with no winners", function () {
    it("Should fail to enter", async function () {
      // Move hre 1 week in the future
      let endTime = await lotteryContract.endTime();
      await ethers.provider.send("evm_mine", [Number(endTime)]);
      await expect(
        lotteryContract
          .connect(accounts[0])
          .enter(1, { value: ethers.utils.parseEther("0.001") })
      ).to.be.reverted;
    });

    it("Close Lottery with no winners", async function () {
      await lotteryContract.closeWeek(4);
      expect(await lotteryContract.week()).to.equal(2);
      const entries = await lotteryContract.getEntriesForNumber(4, 1);
      expect(entries).to.be.empty;
    });

    it("Pot should roll over", async function () {
      const pot = await lotteryContract.pot();
      expect(pot).to.equal(ethers.utils.parseEther("0.002"));
    });

    it("End time should push back 1 week from original end time", async function () {
      let weekAfter = nextWeek + 604800;
      expect(await lotteryContract.endTime()).to.equal(weekAfter);
    });
  });

  describe("Second week", function () {
    it("Users enter between 1-3", async function () {
      for (let account of accounts) {
        let randomNumber = Math.floor(Math.random() * 3);
        await lotteryContract
          .connect(account)
          .enter(randomNumber, { value: ethers.utils.parseEther("0.0001") });
        const entries = await lotteryContract.getEntriesForNumber(randomNumber, 2);
        expect(entries).to.include(account.address);
      }
    });

    it("Choose winners", async function () {
      const winningNumber = 2;

      // Move hre 1 week in the future
      let endTime = await lotteryContract.endTime();
      await ethers.provider.send("evm_mine", [Number(endTime)]);

      const winners = await lotteryContract.getEntriesForNumber(winningNumber, 2);
      let balanceBefore = await ethers.provider.getBalance(winners[0]);
      await lotteryContract.closeWeek(winningNumber);

      const balanceAfter = await ethers.provider.getBalance(winners[0]);
      expect(balanceAfter.gt(balanceBefore)).to.be.true;
    });

    it("Should move to week 3", async function () {
      expect(await lotteryContract.week()).to.equal(3);
      expect(await lotteryContract.pot()).to.equal(0);
    });
  });
});

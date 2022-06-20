const { assert, expect } = require("chai");
const { network, getNamedAccounts, ethers, deployments } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name) ||
  describe("Raffle", function () {
    let vrfCoordinatorAdress, raffle, deployer, interval;
    const raffleEntranceFee = ethers.utils.parseEther("0.1");
    let vrfCoordinatorMock;
    beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer;
      await deployments.fixture(["all"]);
      raffle = await ethers.getContract("Raffle", deployer);
      vrfCoordinatorMock = await ethers.getContract(
        "VRFCoordinatorV2Mock",
        deployer
      );
      vrfCoordinatorAdress = vrfCoordinatorMock.address;
      interval = await raffle.getInterval();
    });

    describe("constructor", function () {
      it("check for the raffle state", async function () {
        const response = await raffle.getRaffleState();
        assert.equal(response.toString(), "0");
      });
    });

    describe("enterRaffle", function () {
      it("check for the entrance of raffle", async function () {
        await expect(raffle.enterRaffle()).to.be.revertedWith(
          "Raffle__NotEnoughETHEntered"
        );
      });
      it("check for the raffle state", async function () {
        const response = await raffle.getRaffleState();
        assert.equal(response.toString(), "0");
      });
      it("check for one address pushed to array", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        const response = await raffle.getPlayer(0);
        assert.equal(response, deployer);
      });
      it("emits an event", async function () {
        await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
          raffle,
          "RaffleEnter"
        );
      });
      it("does not allow to enter raffle when calculating", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);
        // Pretend to be Keeper
        await raffle.performUpkeep([]);
        await expect(
          raffle.enterRaffle({ value: raffleEntranceFee })
        ).to.be.revertedWith("Raffle__NotOpen");
      });
    });
    describe("checkUpkeep", function () {
      it("returns false if not send enough ETH", async function () {
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);
        // Simulate a transaction instead of doing actual transaction
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
        assert(!upkeepNeeded);
      });
      it("returns false if raffle not open", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);
        // Pretend to be Keeper
        await raffle.performUpkeep("0x");
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
        assert(!upkeepNeeded);
      });
      // it("is raffle in open state, has Balance and has Players", async function () {
      //   await raffle.enterRaffle({ value: raffleEntranceFee });
      //   // Raffle in Open State
      //   const raffleState = await raffle.getRaffleState();
      //   assert.equal(raffleState.toString(), "0");
      //   // Rafflle Has Balance
      //   assert((await ethers.provider.getBalance(raffle.address)) > 0);

      //   // Raffle Has Players
      //   assert(await raffle.getPlayer(0));
      // });
    });
    describe("performUpkeep", function () {
      it("can only run if checkUpkeep is true", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);
        const tx = await raffle.performUpkeep([]);
        assert(tx);
      });
      it("reverts if checkUpkeep is false", async function () {
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);
        await expect(raffle.performUpkeep([])).to.be.revertedWith(
          "Raffle__UpKeepNotNeeded"
        );
      });
      it("Updates the raffle state, emits the event, calls the vrf coordinator", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);
        const txResponse = await raffle.performUpkeep([]);
        const txReceipt = await txResponse.wait(1);
        const requestId = txReceipt.events[1].args.requestID;

        // Updates the raffle state
        const raffleState = await raffle.getRaffleState();
        assert(raffleState.toString() === "1");

        // Calls the coordinator and emits the event
        assert(requestId.toNumber() > 0);
      });
    });

    describe("fulfullRandomWords", function () {
      beforeEach(async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee });
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.send("evm_mine", []);
      });

      it("cannot call before the performUpkeep", async function () {
        await expect(
          vrfCoordinatorMock.fulfillRandomWords(0, raffle.address)
        ).to.be.revertedWith("nonexistent request");
        await expect(
          vrfCoordinatorMock.fulfillRandomWords(1, raffle.address)
        ).to.be.revertedWith("nonexistent request");
      });

      it("picks a winner, reset the lottery, and sends money", async function () {
        const additionalAccounts = 3;
        const accounts = await ethers.getSigners();
        for (let i = 1; i <= additionalAccounts; i++) {
          const accountRaffleConnect = await raffle.connect(accounts[i]);
          await accountRaffleConnect.enterRaffle({ value: raffleEntranceFee });
        }
        const startingTimeStamp = await raffle.getLatestTimeStamp();
        // Listen for listener
        await new Promise(async (resolve, reject) => {
          raffle.once("WinnerPicked", async () => {
            try {
              const recentWinner = await raffle.getRecentWinner();
              // All the test will be done here
              const raffleState = await raffle.getRaffleState();
              const endingTimeStamp = await raffle.getLatestTimeStamp();
              const numPlayers = await raffle.getNumberOfPlayers();

              // asserts
              assert.equal(raffleState.toString(), "0");
              assert.equal(numPlayers.toString(), "0");
              assert(endingTimeStamp > startingTimeStamp);
            } catch (e) {
              reject(e);
            }
            resolve();
          });
          const tx = await raffle.performUpkeep([]);
          const txReceipt = await tx.wait(1);
          const winnerStartingBalance =
            await vrfCoordinatorMock.fulfillRandomWords(
              txReceipt.events[1].args.requestID,
              raffle.address
            );
        });
      });
    });
  });

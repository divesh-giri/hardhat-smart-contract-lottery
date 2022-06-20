const { assert, expect } = require("chai");
const { network, getNamedAccounts, ethers, deployments } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name) ||
  describe("Raffle", function () {
    let vrfCoordinatorAdress, raffle, deployer, interval;
    const raffleEntranceFee = ethers.utils.parseEther("0.1");
    beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer;
      await deployments.fixture(["all"]);
      raffle = await ethers.getContract("Raffle", deployer);
      const vrfCoordinatorMock = await ethers.getContract(
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
  });

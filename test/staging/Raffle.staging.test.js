const { expect, assert } = require("chai");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name) ||
  describe("Raffle", function () {
    let deployer, raffle, raffleEntranceFee;
    beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer;
      raffle = await ethers.getContract("Raffle", deployer);
      raffleEntranceFee = await raffle.getEntranceFee();
    });
    describe("fulfillRandomWords", function () {
      it("works with live chainlink Keepers, chainlink VRF, get a random winner", async function () {
        const startingTimeStamp = await raffle.getLatestTimeStamp();
        const accounts = await ethers.getSigners();

        // Listen for the new Promise
        await new Promise(async (resolve, reject) => {
          await raffle.once("WinnerPicked", async function () {
            try {
              // All the test will be written here
              const recentWinner = await raffle.getRecentWinner();
              const endingTimeStamp = await raffle.getLatestTimeStamp();
              const raffleState = await raffle.getRaffleState();
              const winnerEndingBalance = accounts[0].getBalance();
              await expect(raffle.getPlayer(0)).to.be.reverted;
              assert.equal(raffleState.toString(), "0");
              assert(endingTimeStamp > startingTimeStamp);
              assert.equal(
                winnerEndingBalance.toString(),
                (await winnerStartingBalance).add(
                  raffleEntranceFee.mul(accounts.length).toString()
                )
              );
            } catch (e) {
              reject(e);
            }
          });
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const winnerStartingBalance = accounts[0].getBalance();
          resolve();
        });
      });
    });
  });

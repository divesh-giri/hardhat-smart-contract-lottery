const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

const BASE_FEE = ethers.utils.parseEther("0.25");
const GAS_PRICE_LINK = 1e9; // LINK per GAS
module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const args = [BASE_FEE, GAS_PRICE_LINK];
  if (developmentChains.includes(network.name)) {
    log("Local Network Detected!! Deploying Mocks...");
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      args: args,
      logs: true,
      waitConfirmations: 1,
    });
  }
};

module.exports.tags = ["all", "mocks"];

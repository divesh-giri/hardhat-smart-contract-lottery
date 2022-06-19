const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const deployer = await getNamedAccounts();

  if (developmentChains.includes(network.name)) {
    log("Local Network Detected!! Deploying Mocks...");
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      args: [],
      logs: true,
      waitConfirmations: 1,
    });
  }
};

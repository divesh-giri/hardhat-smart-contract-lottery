const { run } = require("hardhat");

const verify = async function (contactAddress, args = []) {
  console.log("Verifying contract...");
  try {
    await run("verify:verify", {
      address: contactAddress,
      constructorArguments: args,
    });
  } catch (err) {
    if (err.message.toLowerCase().includes("already verified")) {
      console.log("Already Verified");
    } else {
      console.log(err);
    }
  }
};

module.exports = {
  verify,
};

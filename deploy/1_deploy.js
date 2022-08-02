const hre = require("hardhat");
const airnodeProtocol = require("@api3/airnode-protocol");

module.exports = async () => {
  const airnodeRrpAddress =
    airnodeProtocol.AirnodeRrpAddresses[await hre.getChainId()];
  nextWeek = Math.floor(Date.now() / 1000) + 9000;

  const lotteryContract = await hre.deployments.deploy("Lottery", {
    args: [nextWeek, airnodeRrpAddress],
    from: (await getUnnamedAccounts())[0],
    log: true,
  });
  console.log(`Deployed Lottery Contract at ${lotteryContract.address}`);
};

module.exports.tags = ["deploy"];

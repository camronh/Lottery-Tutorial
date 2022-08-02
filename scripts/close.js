// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const Lottery = await hre.deployments.get("Lottery");
  const lotteryContract = new hre.ethers.Contract(
    Lottery.address,
    Lottery.abi,
    (await hre.ethers.getSigners())[0]
  );
  console.log("Making request for random number...");
  const receipt = await lotteryContract.getWinningNumber({ // After lottery closes, request a random number
    value: ethers.utils.parseEther("0.01"), // Top up the sponsor wallet
  });

  // Retrieve request ID from event
  const requestId = await new Promise((resolve) => 
    hre.ethers.provider.once(receipt.hash, (tx) => {
      const log = tx.logs.find(
        (log) => log.address === lotteryContract.address
      );
      const parsedLog = lotteryContract.interface.parseLog(log);
      resolve(parsedLog.args.requestId);
    })
  );

  console.log(`Request made! Request ID: ${requestId}`);

  // Wait for the fulfillment transaction to be confirmed and read the logs to get the random number
  await new Promise((resolve) =>
    hre.ethers.provider.once(
      lotteryContract.filters.ReceivedRandomNumber(requestId, null),
      resolve
    )
  );

  const winningNumber = await lotteryContract.winningNumber(1); // Get the winning number
  console.log(
    `Fulfillment is confirmed, random number is ${winningNumber.toString()}`
  );
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

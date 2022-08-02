const hre = require("hardhat");

async function main() {
  const guess = 55; // The number we choose for our lottery entry
  const [account] = await hre.ethers.getSigners();

  const Lottery = await hre.deployments.get("Lottery");
  const lotteryContract = new hre.ethers.Contract(
    Lottery.address,
    Lottery.abi,
    account
  );

  const ticketPrice = await lotteryContract.ticketPrice(); // Get the price of a ticket
  const tx = await lotteryContract.enter( // Enter the lottery
    guess, // Pass in our guess
    { value: ticketPrice } // Include the ticket price in Eth in the transaction
  );
  await tx.wait(); // Wait for the transaction to be mined
  const entries = await lotteryContract.getEntriesForNumber(guess, 1); // Get a list of entries for our guess. Our address should be inside
  console.log(`Guesses for ${guess}: ${entries}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("hardhat-deploy");
console.log("process.env.RPC_URL: " + process.env.RPC_URL);

task(
  "balance",
  "Prints the balance of the first account",
  async (taskArgs, hre) => {
    const [account] = await hre.ethers.getSigners(); // Get an array of all accounts

    const balance = await account.getBalance(); // Get Eth balance for account in wei
    console.log(
      `${account.address}: (${hre.ethers.utils.formatEther(balance)} ETH)` // Print the balance in Ether
    );
  }
);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: { // Hardhat local network
      chainId: 5, // Force the ChainID to be 5 (Goerli)
      forking: {
        url: process.env.RPC_URL,
      }
    },
    mumbai: {
      url: process.env.RPC_URL, // Reuse our Goerli RPC URL
      accounts: { mnemonic: process.env.MNEMONIC } // Use our wallet mnemonic
    }
  }
};
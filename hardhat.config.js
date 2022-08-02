require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");

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
    hardhat: {
      // Hardhat local network
      chainId: 3, // Force the ChainID to be 3 (Ropsten). Will come in handy during testing
      forking: {
        // Configure the forking behavior
        url: process.env.RPC_URL, // Using the RPC_URL from the .env file
      },
    },
    ropsten: {
      url: process.env.RPC_URL,
      accounts: { mnemonic: process.env.MNEMONIC },
    },
  },
};

require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: { // Hardhat local network
      chainId: 3, // Force the ChainID to be 3 (Ropsten). Will come in handy during testing
      forking: { // Configure the forking behaviour
        url: process.env.RPC_URL, // Using the RPC_URL from the .env file
      }
    },
  }
};
# Beginners Web3/Solidity/Blockchain Tutorial Part 2

In [Part 1](https://github.com/camronh/Lottery-Tutorial/tree/Part1) we created the functionality for our lottery dApp. In Part 2, we will 
be integrating the API3 QRNG into our contract. and deploying it onto the Rinkeby public testnet. 


## Instructions
### Forking

[[Explain Forking Here]]

#### 1. DotEnv

We are going to be using sensitive credentials in the next steps. We will be using the [DotEnv](https://www.npmjs.com/package/dotenv) package to store those credentials. 

```bash
npm install dotenv
```

Next, make a `.env` file in the root of your project. 

Make an [Infura](https://infura.io/) account, get the Ropsten RPC and add the following to your `.env` file:

```text
RPC_URL="{PUT RPC URL HERE}"
```

Now add the following to the top of you `hardhat.config.js` file to use the Infura RPC:

```js
require("dotenv").config();
```

We can tell git to ignore the `.env` file by adding the following to a `.gitignore` file:

```text
.env
```

#### 2. Configure Hardhat to use forking

By adding the following to our `module.exports` in the `hardhat.config.js` file, we tell hardhat to make a copy of the Ropsten network for use in local testing:

```js
module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: { // Hardhat local network
      chainId: 3, // Force the ChainID to be 3 (Ropsten) in testing
      forking: { // Configure the forking behaviour
        url: process.env.RPC_URL, // Using the RPC_URL from the .env file
      }
    },
  }
};
```
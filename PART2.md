# Beginners Web3/Solidity/Blockchain Tutorial Part 2

In [Part 1](https://github.com/camronh/Lottery-Tutorial/tree/Part1) we created the functionality for our lottery dApp. In Part 2, we will 
be integrating the API3 QRNG into our contract. and deploying it onto the Rinkeby public testnet. 


## Instructions
### 1. Forking

[[Explain Forking Here]]

#### DotEnv

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

#### Configure Hardhat to use forking

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

### 2. Make contract an Airnode Requester

#### Install dependencies

```bash
npm install @api3/airnode-protocol
```

#### Import the Airnode Protocol into contract

At the top of `Lottery.sol`, underneath the solidity version, import the Airnode RRP Contract:

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";

contract Lottery is RrpRequesterV0{
```

#### Rewrite our constructor

We need to set the address of the RRP contract we are using. We can do that in the constructor by making it an argument for deployment:

```solidity
constructor(uint256 _endTime, address _airnodeRrpAddress)
    RrpRequesterV0(_airnodeRrpAddress) 
{
    require(_endTime > block.timestamp, "End time must be in the future");
    endTime = _endTime; // store the end time of the lottery
}
```

#### Test

At the top of the `tests/Lottery.js` file, import the Airnode protocol package:

```js
const airnodeProtocol = require("@api3/airnode-protocol");
```

We need to pass the address of the RRP contract into the constructor. We can do that by adding the following to our "Deploys" test:

```js
it("Deploys", async function () {
    const Lottery = await ethers.getContractFactory("Lottery");
    accounts = await ethers.getSigners();
    nextWeek = Math.floor(Date.now() / 1000) + 604800;

    let { chainId } = await ethers.provider.getNetwork(); // Get the chainId we are using in hardhat
    const rrpAddress = airnodeProtocol.AirnodeRrpAddresses[chainId]; // Get the AirnodeRrp address for the chainId


    lotteryContract = await Lottery.deploy(nextWeek, rrpAddress); // Pass address in to the constructor
    expect(await lotteryContract.deployed()).to.be.ok;
});
```

Run `npx hardhat test` to test your code.

### 3. Setup Airnode

#### Params

We need to store the [Airnode Params](https://docs.api3.org/qrng/reference/providers.html) in the contract. In the `Lottery.sol` contract, add the following to the global variables:

```solidity
address public constant airnodeAddress =  0x9d3C147cA16DB954873A498e0af5852AB39139f2; 
bytes32 public constant endpointId = 0xfb6d017bb87991b7495f563db3c8cf59ff87b09781947bb1e417006ad7f55a78;
address public sponsorWallet; // We will store the sponsor wallet here later
```


#### Set the sponsor wallet

We need to make the contract Ownable. That will allow us to restrict the ability to set the sponsor wallet to the contract owner.

First, import the `Ownable` contract at the top of the `Lottery.sol` contract:

```solidity
import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Lottery is RrpRequesterV0, Ownable {
```

Now we can make our `setSponsorWallet` function and attach the `onlyOwner` modifier to restrict access:

```solidity
function setSponsorWallet(address _sponsorWallet) public onlyOwner {
    sponsorWallet = _sponsorWallet;
}
```


#### Test

We'll be deriving our sponsor wallet using the `@api3/airnode-admin` package. We can import it into our `tests/Lottery.js` file:

```js
const airnodeAdmin = require("@api3/airnode-admin");
```

We will hardcode the [ANU QRNG Xpub and Airnode Address](https://docs.api3.org/qrng/reference/providers.html) to derive our sponsor wallet address. 
Add the following test inside the "Deployment" tests:

```js
it("Sets sponsor wallet", async function () {
    const sponsorWalletAddress = await airnodeAdmin.deriveSponsorWalletAddress(
        "xpub6DXSDTZBd4aPVXnv6Q3SmnGUweFv6j24SK77W4qrSFuhGgi666awUiXakjXruUSCDQhhctVG7AQt67gMdaRAsDnDXv23bBRKsMWvRzo6kbf", // ANU Xpub
        "0x9d3C147cA16DB954873A498e0af5852AB39139f2", // ANU Airnode Address
        lotteryContract.address
    );
    await expect(lotteryContract.connect(accounts[1]).setSponsorWallet(sponsorWalletAddress)).to.be.reverted; // onlyOwner should be able to call this function
    
    await lotteryContract.setSponsorWallet(sponsorWalletAddress);
    expect(await lotteryContract.sponsorWallet()).to.equal(sponsorWalletAddress);
});
```

run `npx hardhat test` to test your code.

### 4. Write request function


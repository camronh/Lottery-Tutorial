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
    hardhat: {
      // Hardhat local network
      chainId: 3, // Force the ChainID to be 3 (Ropsten) in testing
      forking: {
        // Configure the forking behaviour
        url: process.env.RPC_URL, // Using the RPC_URL from the .env file
      },
    },
  },
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
  await expect(
    lotteryContract.connect(accounts[1]).setSponsorWallet(sponsorWalletAddress)
  ).to.be.reverted; // onlyOwner should be able to call this function

  await lotteryContract.setSponsorWallet(sponsorWalletAddress);
  expect(await lotteryContract.sponsorWallet()).to.equal(sponsorWalletAddress);
});
```

run `npx hardhat test` to test your code.

### 4. Write request function

In the `Lottery.sol` contract, add the following function:

```solidity
function getWinningNumber() public payable {
    // require(block.timestamp > endTime, "Lottery has not ended"); // not available until end time has passed
    require(msg.value >= 0.01 ether, "Please top up sponsor wallet"); // user needs to send 0.01 ether with the transaction
    bytes32 requestId = airnodeRrp.makeFullRequest(
        airnodeAddress,
        endpointId,
        address(this), // Use the contract address as the sponsor. This will allow us to skip the step of sponsoring the requester
        sponsorWallet,
        address(this),
        this.closeWeek.selector,
        "" // No params
    );
    pendingRequestIds[requestId] = true; // Store the pendingRequestIds in a mapping
    emit RequestedRandomNumber(requestId); // Emit an event that the request has been made
    payable(sponsorWallet).transfer(msg.value); // Transfer the ether to the sponsor wallet
}
```

We will leave line 2 commented out for ease of testing. In lines 4-12 we are making a request to the API3 QRNG for a single random number. In line 15 we transfer the gas funds to the sponsor wallet so Airnode has the gas to return the random number.

#### Map pending request ids

In line 13 we are storing the requestId in a mapping. This will allow us to check if the request is pending or not. Let's add the following under our mappings:

```solidity
mapping (bytes32 => bool) public pendingRequestIds;
```

#### Create event

In line 14 we emit an event that the request has been made and a request ID has been generated. We need to describe our event at the top of our contract:

```solidity
contract Lottery is RrpRequesterV0, Ownable {
    event RequestedRandomNumber(bytes32 indexed requestId);
```

### 5. Rewrite fulfill function

Let's overwrite the `closeWeek` function to be used exclusively by Airnode when it has a random number ready to be returned. Paste the following over the `closeWeek` function:

```solidity
function closeWeek(bytes32 requestId, bytes calldata data) // Airnode returns the requestId and the payload to be decoded later
    public
    onlyAirnodeRrp // Only AirnodeRrp can call this function
{
    require(pendingRequestIds[requestId], "No such request made");
    delete pendingRequestIds[requestId]; // If the request has been responded to, remove it from the pendingRequestIds mapping

    uint256 _randomNumber = abi.decode(data, (uint256)) % MAX_NUMBER; // Decode the random number from the data and modulo it by the max number
    emit ReceivedRandomNumber(requestId, _randomNumber); // Emit an event that the random number has been received

    // require(block.timestamp > endTime, "Lottery is open"); // will prevent duplicate closings. If someone closed it first it will increment the end time and not allow

    // The rest we can leave unchanged
    winningNumber[week] = _randomNumber;
    address[] memory winners = tickets[week][_randomNumber];
    week++;
    endTime += 7 days;
    if (winners.length > 0) {
        uint256 earnings = pot / winners.length;
        pot = 0;
        for (uint256 i = 0; i < winners.length; i++) {
            payable(winners[i]).transfer(earnings);
        }
    }
}
```

In the first line set the function to take in the request ID and the payload. In line 3 we add a modifier to restrict this function to only be access by Airnode RRP.
On line 5 and 6 we handle the request ID. If the request ID is not in the `pendingRequestIds` mapping, we throw an error, otherwise we delete the request ID from the `pendingRequestIds` mapping.

In line 8 we decode and typecast the random number from the payload. We don't need to import anything to use `abi.decode()`. Then we use the modulo operator (`%`) to ensure that the random number is between 0 and the max number.

Line 11 will prevent duplicate requests from being fulfilled. If more than 1 request is made, the first one to be fulfilled will increment the `endTime` and the rest will revert. We will leave it commented out for now to make testing easy.

#### Create event

In line 12 we emit an event that the random number has been received. We need to describe our event at the top of our contract under our other event:

```solidity
event ReceivedRandomNumber(bytes32 indexed requestId, uint256 randomNumber);
```

### 6. Hardhat-Deploy

We will be using Hardhat-Deploy to deploy and manage our contracts on different chains. First lets install the `hardhat-deploy` package:

#### Install

```bash
npm install -D hardhat-deploy
```

Then at the top of your `hardhat.config.js` file add the following:

```js
require("hardhat-deploy");
```

Now we can create a folder named `deploy` in the root to house our deployment scripts Hardhat-Deploy will run all of our deployment scripts in order each time we run `npx hardhat deploy`.

#### Write deploy script

In our `deploy` folder, create a file named `1_deploy.js`. We'll be using hardhat and the Airnode Protocol package so lets import them at the top:

```js
const hre = require("hardhat");
const airnodeProtocol = require("@api3/airnode-protocol");
```

Hardhat deploy scripts should be done through a `module.exports` function **Need more info**. We will use the Airnode Protocol package to retrieve the RRP Contract address needed to deploy. We'll use `hre.getChainId()`, a function included in Hardhat-Deploy, to get the chain ID.

Finally we will deploy the contract using `hre.deployments`. We pass in our arguments, a from address, and set logging to true.

```js
module.exports = async () => {
  const airnodeRrpAddress =
    airnodeProtocol.AirnodeRrpAddresses[await hre.getChainId()]; // Retrieve the RRP address for the current chain
  nextWeek = Math.floor(Date.now() / 1000) + 9000; // Constructor takes in an `endTime` param.

  const lotteryContract = await hre.deployments.deploy("Lottery", {
    args: [nextWeek, airnodeRrpAddress], // Constructor arguments
    from: (await getUnnamedAccounts())[0], // From account
    log: true,
  });
  console.log(`Deployed Lottery Contract at ${lotteryContract.address}`);
};
```

Finally, lets name our script at the bottom of our `1_deploy.js` file:

```js
module.exports.tags = ["deploy"];
```

#### Test locally

Let's try it out! We should test on a local blockchain first to make things easy. First lets start up a local blockchain:

```bash
npx hardhat node
```

Then, in a separate terminal, we can deploy to our local chain:

```bash
npx hardhat --network localhost deploy
```

If everything worked well, we should see a message in the console that says our contract address. We can also check the terminal running the chain for more detailed logging. 

> Be sure to leave your blockchain running, as we will be using it throughout the rest of this tutorial.

#### Set sponsor wallet on deployment

We can couple another script with our deployment script so that the `setSponsorWallet` function is called after each deployment. We will start by creating a file in the `deploy` folder called `2_set_sponsorWallet.js`.

We will be using hardhat again, but we will be using the Airnode Admin package in this script. We'll import them at the top:

```js
const hre = require("hardhat");
const airnodeAdmin = require("@api3/airnode-admin");
```

Now lets make our `module.exports` function that sets the sponsor wallet. First we'll use Ethers to get a wallet. We can use `hre.deployments.get` to retrieve past deployments thanks to Hardhat-Deploy. Next, we instantiate our deployed contract within our script. Our deployed contract is ready to be interacted with!

Lets derive our sponsor wallet so that we can pass it into our `setSponsorWallet` function. We can use the `deriveSponsorWalletAddress` function from the Airnode Admin package. It take an Airnode provider's Xpub, and Airnode address, and finally the address of the sponsor which in our case is the contract itself.

Now we can then make the transaction to set the sponsor wallet.

```js
module.exports = async () => {
  const [account] = await hre.ethers.getSigners(); // Get the first account from Ethers
  const Lottery = await hre.deployments.get("Lottery"); // Get the deployed contract
  const lotteryContract = new hre.ethers.Contract( // Instantiate contract
    Lottery.address,
    Lottery.abi, // Interface of the contract
    account
  );

  const sponsorWalletAddress = await airnodeAdmin.deriveSponsorWalletAddress(
    "xpub6DXSDTZBd4aPVXnv6Q3SmnGUweFv6j24SK77W4qrSFuhGgi666awUiXakjXruUSCDQhhctVG7AQt67gMdaRAsDnDXv23bBRKsMWvRzo6kbf", // QRNG xpub
    "0x9d3C147cA16DB954873A498e0af5852AB39139f2", // QRNG Airnode address
    lotteryContract.address // Sponsor address
  );
  const tx = await lotteryContract.setSponsorWallet(sponsorWalletAddress); // Set the sponsor wallet
  await tx.wait();
  console.log(`Sponsor wallet set to: ${sponsorWalletAddress}`);
};
```

Now lets add a Hardhat-Deploy tag to our script so that it runs after each deployment:

```js
module.exports.tags = ["setup"];
```

Lets try it out!

```bash
npx hardhat --network localhost deploy
```

### 7. Live testing!

In this step, we will be testing our contract on a live testnet blockchain. This means that our random number requests will be answered by the ANU QRNG Airnode.

#### Enter script

We need to write a script that will connect to our deployed contract and enter the lottery. We will start by creating a file in the `scripts` folder named `enter.js`. If you look inside of the boilerplate `deploy.js` file, you'll see Hardhat recommends a format for scripts:

```js
const hre = require("hardhat");

async function main() {
  // Your script logic here...
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Inside the `main` funtion, we can put our enter script:

```js
const guess = 55; // The number we chose for our lottery entry
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
```

We can try it out by running the script against our local deployment:

```bash
npx hardhat --network localhost run scripts/enter.js
```




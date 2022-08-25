# Part 1 - Decentralization

In [Part 1](https://github.com/camronh/Lottery-Tutorial/tree/Part1) we created the functionality for our lottery dApp. In Part 2, we'll
be integrating the [API3 QRNG](https://api3.org/QRNG) into our contract and deploying it onto the [Ethereum Goerli public testnet](https://ethereum.org/en/developers/docs/networks/#goerli). Alternatively, you may use another supported [chain](https://docs.api3.org/qrng/reference/chains.html) in place of Goerli by following the same steps and substituting accordingly.

We'll be using the [Airnode Request-Response Protocol (RRP)](https://docs.api3.org/airnode/v0.7/concepts/) to get the random numbers onto the blockchain for the lottery. API3 QRNG is an Airnode [first-party oracle](https://docs.api3.org/api3/introduction/first-party-oracles.html) serving these random numbers from the Australian National University for blockchain and Web3 use-cases. Check our [API3 docs](https://docs.api3.org/api3/) to learn more about API3 and get an [overview of Airnode](https://docs.api3.org/airnode/v0.7/).  

## Instruction

### Forking

As mentioned in Part 1, [Hardhat](https://hardhat.org/) is an [Ethereum development environment](https://ethereum.org/en/developers/docs/development-networks/) that allows us to deploy smart contracts to public Ethereum networks, and in this case, spin up a locally running Ethereum blockchain instance for testing our deployed contract. We can do this by configuring Hardhat to ["fork"](https://hardhat.org/hardhat-network/docs/guides/forking-other-networks) the [Ethereum Goerli testnet](https://ethereum.org/en/developers/docs/networks/#goerli), which will simulate the [state](https://ethereum.org/en/developers/docs/evm/#state) of the public network locally by fetching the data and exposing it transparently. We'll also need to connect to an [Ethereum archive node](https://www.alchemy.com/overviews/archive-nodes) to use this feature. We'll be using [Alchemy](https://www.alchemy.com/) below as our blockchain RPC node provider.


#### 1. DotEnv

We're going to use sensitive credentials in the next steps. We'll be using the [DotEnv](https://www.npmjs.com/package/dotenv) package to store those credentials as environment variables separately from our application code.

```bash
npm install dotenv
```

Next, make a `.env` file at the root of your project.

Make an [Alchemy](https://www.alchemy.com/) account. Click the "CREATE APP" button and select the Goerli testnet from the dropdown menu, as the rest of the available testnets are [deprecated or will soon be deprecated](https://blog.ethereum.org/2022/06/21/testnet-deprecation/). Insert your newly-generated Goerli RPC endpoint URL to your `.env` file:
.
```text
RPC_URL="{PUT RPC URL HERE}"
```

Then add the following to the top of your `hardhat.config.js` file to load your `RPC_URL` variable.

```js
require("dotenv").config();
```

#### 2. Configure Hardhat to use forking

By adding the following to our `module.exports` in the `hardhat.config.js` file, we tell Hardhat to make a copy of the [Goerli network](https://ethereum.org/en/developers/docs/networks/#goerli) for use in local testing:

```js
module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: { // Hardhat local network
      chainId: 5, // Force the ChainID to be 5 (Goerli) in testing
      forking: { // Configure the forking behavior
        url: process.env.RPC_URL, // Using the RPC_URL from the .env file
      },
    },
  },
};
```

### Turn contract into an [Airnode Requester](https://docs.api3.org/airnode/v0.7/concepts/requester.html)

As a requester, our `Lottery.sol` contract will make requests to an Airnode, specifically the API3 QRNG, using the [Request-Response Protocol (RRP)](https://docs.api3.org/airnode/v0.7/concepts/). It may be helpful to take a little time familiarize yourself if you haven't already. 

#### 1. Install dependencies

```bash
npm install @api3/airnode-protocol
```

#### 2. Import the [Airnode Protocol](https://docs.api3.org/airnode/v0.7/concepts/) into contract

At the top of `Lottery.sol`, below the solidity version, import the [Airnode RRP Contract](https://docs.api3.org/airnode/v0.7/grp-developers/call-an-airnode.html#step-1-inherit-rrprequesterv0-sol) from the [npm registry](https://www.npmjs.com/):

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";

contract Lottery is RrpRequesterV0{
```

#### 3. Modify our constructor

We need to set the public [address](https://docs.api3.org/airnode/v0.7/reference/airnode-addresses.html) of the Airnode RRP contract on the blockchain that we're using. We can do this in the constructor by making it an argument for deployment:

```solidity
constructor(uint256 _endTime, address _airnodeRrpAddress)
    RrpRequesterV0(_airnodeRrpAddress)
{
    require(_endTime > block.timestamp, "End time must be in the future");
    endTime = _endTime; // store the end time of the lottery
}
```

#### 4. Test

At the top of the `test/Lottery.js` file, import the [Airnode protocol package](https://www.npmjs.com/package/@api3/airnode-protocol):

```js
const airnodeProtocol = require("@api3/airnode-protocol");
```

We need to pass the [address](https://docs.api3.org/airnode/v0.7/reference/airnode-addresses.html) of the RRP contract into the constructor. We can do that by adding the following to our "Deploys" test:

```js
it("Deploys", async function () {
  const Lottery = await ethers.getContractFactory("Lottery"); // Create a factory object to deploy instances of our lottery smart contract
  accounts = await ethers.getSigners(); // Get list of Ethereum accounts (signers) in the node we're connected to (Hardhat Network)
  nextWeek = Math.floor(Date.now() / 1000) + 604800;

  let { chainId } = await ethers.provider.getNetwork(); // Get the chainId we are using in hardhat
  const rrpAddress = airnodeProtocol.AirnodeRrpAddresses[chainId]; // Get the AirnodeRrp address for the chainId

  lotteryContract = await Lottery.deploy(nextWeek, rrpAddress); // Deploy contract, pass address into the constructor
  expect(await lotteryContract.deployed()).to.be.ok;
});
```

Run `npx hardhat test` to check that your code passes all 3 tests before moving on.

### Set up Airnode

#### 1. Parameters

[Airnode Parameters](https://docs.api3.org/airnode/v0.7/grp-developers/call-an-airnode.html#request-parameters) need to be stored in our contract. In `Lottery.sol`, add the following to the global variables:

```solidity
address public constant airnodeAddress =  0x9d3C147cA16DB954873A498e0af5852AB39139f2; // ANU's Airnode address
bytes32 public constant endpointId = 0xfb6d017bb87991b7495f563db3c8cf59ff87b09781947bb1e417006ad7f55a78; // ANU's uint256 endpointId
address payable public sponsorWallet; // We will store the sponsor wallet here later
```

The `airnodeAddress` and `endpointID` of a particular Airnode can be found in the documentation of the API provider, which in this case is [API3 QRNG](https://docs.api3.org/qrng/reference/providers.html#anu-quantum-random-numbers).

#### 2. Set the [sponsor wallet](https://docs.api3.org/airnode/v0.7/concepts/sponsor.html#sponsorwallet)

To pay for the fulfillment of Airnode requests, normally we'll need to [sponsor the requester](https://docs.api3.org/airnode/v0.7/grp-developers/requesters-sponsors.html), our `Lottery.sol` contract. In this case, if we use the contract address itself as the `sponsorAddress`, it automatically sponsors itself. 

 We'll need to make our contract "Ownable". That will allow us to restrict access for setting the [`sponsorWallet`](https://docs.api3.org/airnode/v0.7/concepts/sponsor.html#sponsorwallet) to the contract owner (the wallet/account that deployed the contract). Note that `sponsorWallet` is different than a `sponsorAddress`.

First, import the [`Ownable` contract](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable) at the top of `Lottery.sol`:

```solidity
import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Lottery is RrpRequesterV0, Ownable {
```

Then we can make our `setSponsorWallet` function and attach the `onlyOwner` modifier to restrict access:

```solidity
function setSponsorWallet(address payable _sponsorWallet) external onlyOwner {
    sponsorWallet = _sponsorWallet;
}
```

#### 3. Test

We'll be deriving our `sponsorWallet` used for funding Airnode transactions using functions from the [`@api3/airnode-admin` package/CLI tool](https://docs.api3.org/airnode/v0.7/reference/packages/admin-cli.html). 


```bash
npm install @api3/airnode-admin
```

Then we can import it into our `tests/Lottery.js` file:

```js
const airnodeAdmin = require("@api3/airnode-admin");
```

We'll hardcode the [ANU QRNG's Xpub and Airnode Address](https://docs.api3.org/qrng/reference/providers.html) to [derive our `sponsorWalletAddress`](https://docs.api3.org/airnode/v0.7/grp-developers/requesters-sponsors.html#how-to-derive-a-sponsor-wallet). 
Add the following test underneath the "Deploys" test:

```js
it("Sets sponsor wallet", async function () {
    const anuXpub =
        "xpub6DXSDTZBd4aPVXnv6Q3SmnGUweFv6j24SK77W4qrSFuhGgi666awUiXakjXruUSCDQhhctVG7AQt67gMdaRAsDnDXv23bBRKsMWvRzo6kbf"

    const anuAirnodeAddress = "0x9d3C147cA16DB954873A498e0af5852AB39139f2"

    const sponsorWalletAddress = await airnodeAdmin.deriveSponsorWalletAddress(
        anuXpub,
        anuAirnodeAddress,
        lotteryContract.address // used as the sponsor
    );


    await expect(lotteryContract.connect(accounts[1]).setSponsorWallet(sponsorWalletAddress)).to.be.reverted;

    await lotteryContract.setSponsorWallet(sponsorWalletAddress);
    expect(await lotteryContract.sponsorWallet()).to.equal(sponsorWalletAddress);
});
```

run `npx hardhat test` to test your code.

### Write request function

In the `Lottery.sol` contract, add the following function:

```solidity
function getWinningNumber() external payable {
  // require(block.timestamp > endTime, "Lottery has not ended"); // not available until end time has passed
  require(msg.value >= 0.01 ether, "Please top up sponsor wallet"); // user needs to send 0.01 ether with the transaction
  bytes32 requestId = airnodeRrp.makeFullRequest(
      airnodeAddress,
      endpointId,
      address(this), // Use the contract address as the sponsor. This will allow us to skip the step of sponsoring the requester
      sponsorWallet,
      address(this), // Return the response to this contract
      this.closeWeek.selector, // Call this function with the response
      "" // No params
  );
  pendingRequestIds[requestId] = true; // Store the request id in the pending request mapping
  emit RequestedRandomNumber(requestId); // Emit an event that the request has been made 
  sponsorWallet.call{value: msg.value}(""); // Send funds to sponsor wallet
}
```

We'll leave line 2 commented out for ease of testing. In lines 4-12 we're making a [request](https://docs.api3.org/airnode/v0.7/concepts/request.html#request-parameters) to the API3 QRNG for a single random number. In line 15 we transfer the ether to the sponsor wallet that will pay the gas fees for Airnode to return the random number on-chain.

#### 1. Map pending [request IDs](https://docs.api3.org/airnode/v0.7/concepts/request.html#requestid)

In line 13 we are storing the [`requestId`](https://docs.api3.org/airnode/v0.7/concepts/request.html#requestid) in a mapping. This will allow us to check whether or not the request is pending. Let's add the following under our mappings:

```solidity
mapping (bytes32 => bool) public pendingRequestIds;
```

#### 2. Create event

In line 14 we emit an event that the request has been made and a request ID has been generated. Solidity events are logged as transactions to the Ethereum Virtual Machine, and inform the application that a change has been made on the blockchain. We need to describe our event at the top of our contract:

```solidity
contract Lottery is RrpRequesterV0, Ownable {
    event RequestedRandomNumber(bytes32 indexed requestId);
```

### Rewrite [fulfill](https://docs.api3.org/airnode/v0.7/concepts/request.html#fulfill) function


#### 1. Rewrite `closeWeek`

Let's overwrite the `closeWeek` function:

```solidity
function closeWeek(
  bytes32 requestId,
  bytes calldata data // Airnode returns the requestId and the payload to be decoded later
)
  external
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
          payable(winners[i]).call{value: earnings}(""); // send earnings to each winner
      }
  }
}
```

In the first line set the function to take in the request ID and the payload. In line 3 we add a modifier to restrict this function to only be accessible by Airnode RRP.
On line 5 and 6 we handle the request ID. If the request ID is not in the `pendingRequestIds` mapping, we throw an error, otherwise we delete the request ID from the `pendingRequestIds` mapping.

In line 8 we decode and typecast the random number from the payload. We don't need to import anything to use [`abi.decode()`](https://docs.api3.org/airnode/v0.7/reference/specifications/airnode-abi-specifications.html). Then we use the modulo operator (`%`) to ensure that the random number is between 0 and the max number.

Line 11 will prevent duplicate requests from being fulfilled. If more than 1 request is made, the first one to be fulfilled will increment the `endTime` and the rest will revert. We will leave it commented out for now to make testing easy.

#### 2. Create event

In line 12 we emit an event that the random number has been received. We need to describe our event at the top of our contract under our other event:

```solidity
event ReceivedRandomNumber(bytes32 indexed requestId, uint256 randomNumber);
```

### Hardhat-Deploy

We will be using Hardhat-Deploy to deploy and manage our contracts on different chains. First lets install the [`hardhat-deploy` package](https://www.npmjs.com/package/hardhat-deploy):

#### 1. Install

```bash
npm install -D hardhat-deploy
```

Then at the top of your `hardhat.config.js` file add the following:

```js
require("hardhat-deploy");
```

Now we can create a folder named `deploy` in the root to house our deployment scripts. Hardhat-Deploy will run all of our deployment scripts in order each time we run `npx hardhat deploy`.

#### 2. Write deploy script

In our `deploy` folder, create a file named `1_deploy.js`. We'll be using hardhat and the Airnode Protocol package so lets import them at the top:

```js
const hre = require("hardhat"); // Instance of Hardhat Runtime Environment
const airnodeProtocol = require("@api3/airnode-protocol");
```

[Hardhat deploy scripts](https://github.com/wighawag/tutorial-hardhat-deploy#writing-deployment-scripts) should be done through a `module.exports` function. We will use the Airnode Protocol package to retrieve the RRP Contract address needed as an argument to deploy our lottery contract. We'll use `hre.getChainId()`, a function included in Hardhat-Deploy, to get the chain ID, which we'd set to 5 in `hardhat.config.js`.

Finally, we'll deploy the contract using `hre.deployments`. We pass in our arguments, a "from" address, and set logging to true.

```js
module.exports = async () => {
  const airnodeRrpAddress = airnodeProtocol.AirnodeRrpAddresses[await hre.getChainId()]; // Retrieve the RRP address for the current chain
  nextWeek = Math.floor(Date.now() / 1000) + 9000; // Constructor takes in an `endTime` param.

  const lotteryContract = await hre.deployments.deploy("Lottery", {
    args: [nextWeek, airnodeRrpAddress], // Constructor arguments
    from: (await getUnnamedAccounts())[0], // From account that owns contract
    log: true,
  });
  console.log(`Deployed Lottery Contract at ${lotteryContract.address}`);
};
```

Finally, lets name our script at the bottom of our `1_deploy.js` file:

```js
module.exports.tags = ["deploy"];
```

#### 3. Test locally

Let's try it out! We should test on a local blockchain first to make things easy. First lets start up a local blockchain. We use the `--no-deploy` flag to prevent Hardhat-Deploy from running the deployment scripts each time you spin up a local node:

```bash
npx hardhat node --no-deploy
```

Then, in a separate terminal, we can deploy to our chain (localhost), specified by the `--network` parameter:

```bash
npx hardhat --network localhost deploy
```

If everything worked well, we should see a message in the console that says our contract address. We can also check the terminal running the chain for more detailed logging.

> Be sure to leave your blockchain running, as we will be using it throughout the rest of this tutorial.

#### 4. Set sponsor wallet on deployment

We can couple another script with our deployment script so that the `setSponsorWallet` function is called after each deployment. We will start by creating a file in the `deploy` folder called `2_set_sponsorWallet.js`.

We will be using hardhat again, but we'll be using the Airnode Admin package in this script. We'll import them at the top:

```js
const hre = require("hardhat"); // Instance of Hardhat Runtime Environment
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

### Live testing!

In this step, we will be testing our contract by [deploying it to a live testnet blockchain](https://hardhat.org/tutorial/deploying-to-a-live-network), allowing others to access an instance that's not running locally. This will allow our random number requests will be answered by the [ANU QRNG Airnode](https://docs.api3.org/qrng/#australian-national-university-anu-quantum-random-numbers-api).

#### 1. Enter script

We need to write a script that will connect to our deployed contract and enter the lottery. We'll start by creating a file in the `scripts` folder named `enter.js`. If you look inside of the boilerplate `deploy.js` file, you'll see Hardhat recommends a format for scripts:

```js
const hre = require("hardhat"); // Instance of Hardhat Runtime Environment

async function main() {
  // Your script logic here...
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Inside the `main` funtion, we can put our "enter" script:

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
const tx = await lotteryContract.enter(
  // Enter the lottery
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

#### 2. Close Lottery script

Next, we need a way for people to call Airnode for a random number when the lottery is closed. We will start by creating a file in the `scripts` folder named `close.js` and adding the boilerplate script code from the last step to it.

In our `main` function, we will instantiate our contract again. We will call the `getWinningNumber` function in our contract to make a random number request. This function emits an event that we can listen to for our requestID that we will use to listen for a response.

When we do hear a response, we can call `winningNumber(1)` to retrieve the winning random number for week 1!

```js
const Lottery = await hre.deployments.get("Lottery");
const lotteryContract = new hre.ethers.Contract(
  Lottery.address,
  Lottery.abi,
  (await hre.ethers.getSigners())[0]
);

console.log("Making request for random number...");
const receipt = await lotteryContract.getWinningNumber({
  // We'll use the tx receipt to get the requestID
  value: ethers.utils.parseEther("0.01"), // Top up the sponsor wallet
});

// Retrieve request ID from event
const requestId = await new Promise((resolve) =>
  hre.ethers.provider.once(receipt.hash, (tx) => {
    const log = tx.logs.find((log) => log.address === lotteryContract.address);
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
```

If we test this against our local chain, we should receive a request ID but no response. That's because the ANU Airnode can't access requests on our local chain.

```bash
npx hardhat --network localhost run scripts/close.js
```
> You can kill the request process after the request Id is printed.

#### 3. Set up Goerli

In this next step, we will be pointing Hardhat towards the Goerli testnet, which will provide a shared staging environment that mimics mainnet without using real money. This means we'll need a wallet with some Goerli ETH funds on it. Even if you have a wallet, it is highly recommended that you create a new wallet for testing purposes.

> Never use a real wallet with real funds on it for development!

First, lets generate the wallet. We will use the [Airnode Admin CLI](https://docs.api3.org/airnode/v0.2/reference/packages/admin-cli-commands.html) to generate a mnemonic, but feel free to create a wallet in any way you see fit.

```sh
npx @api3/airnode-admin generate-mnemonic

# Output
This mnemonic is created locally on your machine using "ethers.Wallet.createRandom" under the hood.
Make sure to back it up securely, e.g., by writing it down on a piece of paper:

genius session popular ... # Our mnemonic

The Airnode address for this mnemonic is: 0x1a942424D880... # The public address to our wallet
The Airnode xpub for this mnemonic is: xpub6BmYykrmWHAhSFk... # The Xpub of our wallet
```

We'll be using the mnemonic and Airnode address (Public Address). Lets add our mnemonic to the `.env` file so that we can use it safely:

```bash
MNEMONIC="genius session popular ..."
```

Next, we'll configure Hardhat to use the Goerli network and our mnemonic. Inside the `networks` object in our `hardhat.config.js` file, modify the `module.exports` to add a network entry:

```js
module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: { // Hardhat local network
      chainId: 5, // Force the ChainID to be 5 (Goerli)
      forking: {
        url: process.env.RPC_URL,
      }
    },
    goerli: {
      url: process.env.RPC_URL, // Reuse our Goerli RPC URL
      accounts: { mnemonic: process.env.MNEMONIC } // Use our wallet mnemonic
    }
  }
};
```

Now we can run all of our commands with the added `--network goerli` flag without needing to change any code.

#### 4. Get Goerli ETH

If you attempted to run any commands against Goerli, chances are that they failed. Thats because we are using our newly generated wallet that doesn't even have the funds to pay for the transaction. We can get some free Goerli ETH for testing by using a Goerli faucet. [This faucet](https://goerlifaucet.com/) requires an Alchemy account, and [this faucet](https://goerli-faucet.mudit.blog/) requires a Twitter or Facebook account. 

We'll paste the public address (**Not Mnemonic!**) from our wallet generation step into either or both faucets:

![Alchemy faucet](https://user-images.githubusercontent.com/81271473/186013366-b536d15b-12ef-491c-a22f-9a797d604928.png)

We can test our accounts in Hardhat by using tasks. Inside of the `hardhat.config.js` file, underneath our imports and above our exports, add the following:

```js
task(
  "balance",
  "Prints the balance of the first account",
  async (taskArgs, hre) => {
    const [account] = await hre.ethers.getSigners(); // Get an array of all accounts

    const balance = await account.getBalance(); // Get balance for account
    console.log(
      `${account.address}: (${hre.ethers.utils.formatEther(balance)} ETH)` // Print the balance in Ether
    );
  }
);
```

Now we can run the `balance` task and see the balance of our account:

```bash
npx hardhat --network goerli balance
```

If you followed the faucet steps correctly (and the faucet is currently operating), you should see the balance of our account is greater than 0 ETH. If not, you may need to wait a little bit longer or try a different faucet.

```bash
0x0EDA9399c969...: (0.5 ETH)
```

#### 5. Use Lottery contract on public chain

We have everything configured to deploy onto a public chain. Lets start with the deployment command:

```bash
npx hardhat --network goerli deploy
```

> Keep in mind things will move much slower on the Goerli network.

Next we will enter our lottery:

```bash
npx hardhat --network goerli run ./scripts/enter.js 
```

And finally, close our lottery:

```bash
npx hardhat --network goerli run ./scripts/close.js
```

![image](https://user-images.githubusercontent.com/26840412/182447459-4dbda7bc-b703-4453-9242-61b4913b1c3a.png)

## Conclusion

This is the end of the tutorial, I hope you learned something! The complete code can be found in the [tutorial repo](https://github.com/camronh/Lottery-Tutorial) (Feel free to drop a ⭐️). If you have any questions, please feel free to join the API3 [Discord](https://discord.com/invite/qnRrcfnm5W). 

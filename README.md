# Part 1 - Create a lottery smart contract

## Instructions

### Setup

Create a folder and open it up in your preferred IDE.

#### 1. Initialize a Node.js project

In a terminal, initialize a project by running the following command:

```
npm init -y
```

#### 2. Install Hardhat

Hardhat is a npm library that helps you work with smart contracts. Since it will only be used for development purposes, we can install it as a dev dependency:

```
npm install -D hardhat
```

#### 3. Initialize the Hardhat project

We will use the Hardhat CLI to create a boilerplate Web3 project:

```
npx hardhat
```

Follow the prompts to `Create a JavaScript project` and choose the default options for the rest.

When the CLI is done creating the project, you should see few new files and directories inside of your project.
boilerplate contracts are located in the `contracts` folder. Tests for that contract are located in the `tests` folder. We will be deleting
these files in the next steps so now would be a good time to look through them.

Run the test command to see the boilerplate contract in action.

```
npx hardhat test
```

When we run `npx hardhat test`, hardhat tests the contracts on a local Ethereum node. This makes it fast and free to try out our contracts.

### Writing the Smart Contract

> The complete contract code can be found in the [Part1 branch](https://github.com/camronh/Lottery-Tutorial/blob/Part1/contracts/Lottery.sol)

#### 1. In the `contracts` folder, delete the `Lock.sol` file and create a file named `Lottery.sol`.

#### 2. Set the solidity version, and start with an empty contract object

```solidity
pragma solidity ^0.8.9;

contract Lottery {}
```

#### 3. Add global variables to the contract

```Solidity
contract Lottery {
    uint256 public pot = 0; // total amount of ether in the pot
    uint256 public ticketPrice = 0.0001 ether; // price of a single ticket
    uint256 public week = 1; // current week counter
    uint256 public endTime; // datetime that current week ends and lottery is closable
    uint256 public constant MAX_NUMBER = 10000; // highest possible number
}
```


#### 4. Underneath the global variables, add our [error handling](https://docs.soliditylang.org/en/v0.8.16/contracts.html#errors-and-the-revert-statement)

```Solidity
error EndTimeReached(uint256 lotteryEndTime);
```

#### 5. Underneath the global variables, add the mappings for tickets and winning numbers

```solidity
mapping(uint256 => mapping(uint256 => address[])) public tickets; // mapping of week => entry choice => list of addresses
mapping(uint256 => uint256) public winningNumber; // mapping to store each weeks winning number
```

#### 6. Underneath the mappings, add the constructor function

When deploying the contract, we'll need to pass in a datetime that the lottery will end. After the lottery ends, the next week will begin and will end
7 days after the original `endTime`.

```Solidity
// Initialize the contract with a set day and time of the week winners can be chosen
constructor(uint256 _endTime) {
    endTime = _endTime;
}
```

#### 7. Underneath the constructor function, add a function to buy a ticket

```solidity
function enter(uint256 _number) external payable {
    require(_number <= MAX_NUMBER, "Number must be 1-MAX_NUMBER"); // guess has to be between 1 and MAX_NUMBER
    if (block.timestamp >= endTime) revert EndTimeReached(endTime); // lottery has to be open
    require(msg.value == ticketPrice, "Ticket price is 0.0001 ether"); // user needs to send 0.0001 ether with the transaction
    tickets[week][_number].push(msg.sender); // add user's address to list of entries for their number under the current week
    pot += ticketPrice; // account for the ticket sale in the pot
}
```

Users can call this function with a number 1-10000 and a value of 0.001 ether to buy a lottery ticket. The user's address is added to the
addresses array in the `tickets` mapping.

#### 8. Create a function to mock the QRNG picking the winners

Before we decentralize our lottery, lets mock the random number generation so that we can test the contracts functionality. We will be
decentralizing this function in Part 2 of this tutorial by using the API3 QRNG.

```solidity
function closeWeek(uint256 _randomNumber) external {
    require(block.timestamp > endTime, "Lottery has not ended"); // not available until end time has passed
    winningNumber[week] = _randomNumber;
    address[] memory winners = tickets[week][_randomNumber]; // get list of addresses that chose the random number this week
    week++; // increment week counter
    endTime += 7 days; // set end time for 7 days later
    if (winners.length > 0) {
        uint256 earnings = pot / winners.length; // divide pot evenly among winners
        pot = 0; // reset pot
        for (uint256 i = 0; i < winners.length; i++) {
            payable(winners[i]).transfer(earnings); // send earnings to each winner
        }
    }
}
```

#### 9. Create read only function

This function will return the list of addresses that chose the given number for the given week.

```Solidity
function getEntriesForNumber(uint256 _number, uint256 _week) public view returns (address[] memory) {
    return tickets[_week][_number];
}
```


#### 10. Create `receive` function

The [receive function](https://docs.soliditylang.org/en/v0.8.14/contracts.html#receive-ether-function) will be called if funds are sent to the contract. In this case, we need to add these funds to the pot.

```Solidity
receive() external payable {
    pot += msg.value; // add funds to the pot
}
```

### Testing the contract

#### 1. In the test folder, delete the `Lock.js` file and create a file called `Lottery.js`.

#### 2. Import npm libraries

```Javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");
```

#### 3. Add tests

We'll start with a simple deployment test to be sure that the contract is deploying correctly.

```JavaScript
describe("Lottery", function () {
  let lotteryContract, accounts, nextWeek;

  it("Deploys", async function () {
      const Lottery = await ethers.getContractFactory("Lottery");
      accounts = await ethers.getSigners();
      nextWeek = Math.floor(Date.now() / 1000) + 604800;
      lotteryContract = await Lottery.deploy(nextWeek);
      expect(await lotteryContract.deployed()).to.be.ok;
  });
});
```

We can use `npx hardhat test` to run the test

Lets add a few more tests but feel free to add any/all of the relevant tests from the [completed test file](https://github.com/camronh/Lottery-Tutorial/blob/Part1/test/Lottery.js)

```JavaScript
describe("Lottery", function () {
    let lotteryContract, accounts, nextWeek;

    it("Deploys", async function () {
        const Lottery = await ethers.getContractFactory("Lottery");
        accounts = await ethers.getSigners();
        nextWeek = Math.floor(Date.now() / 1000) + 604800;
        lotteryContract = await Lottery.deploy(nextWeek);
        expect(await lotteryContract.deployed()).to.be.ok;
    });

    it("Users enter between 1-3", async function () {
        for (let account of accounts) {
            let randomNumber = Math.floor(Math.random() * 3);
            await lotteryContract
                .connect(account)
                .enter(randomNumber, { value: ethers.utils.parseEther("0.0001") });
            const entries = await lotteryContract.getEntriesForNumber(randomNumber, 1);
            expect(entries).to.include(account.address);
        }
    });

    it("Choose winners", async function () {
      const winningNumber = 2;
      // Move hre 1 week in the future
      let endTime = await lotteryContract.endTime();
      await ethers.provider.send("evm_mine", [Number(endTime)]);
      const winners = await lotteryContract.getEntriesForNumber(winningNumber, 1);
      let balanceBefore = await ethers.provider.getBalance(winners[0]);
      await lotteryContract.closeWeek(winningNumber);
      const balanceAfter = await ethers.provider.getBalance(winners[0]);
      expect(balanceAfter.gt(balanceBefore)).to.be.true;
    });
});
```

run `npx hardhat test` to try it out

## Conclusion

In part 1 of this tutorial we learned how build and test a lottery smart contract using Hardhat. The problem is, our `closeWeek` function is not secure.
We wouldn't want anyone who could possibly enter the lottery to be able to pass numbers into the `closeWeek` function. That would lead to serious security concerns.
If anyone had the ability to control the number being passed into the `closeWeek` function, they could manipulate that number for their gain.

In Part 2, we will be decentralizing our lottery contract. We'll use the [API3 QRNG](https://api3.qrng.online/API/jsonInt/1/65535) to generate the winning number.
Anybody will be able to call the `closeWeek` function without a random number. Our contract will then call the API3 QRNG to generate a random number that will be used
to determine the winners. The lottery will run itself with no controlling parties.

### [Get started on Part 2](https://github.com/camronh/Lottery-Tutorial/tree/Part2)

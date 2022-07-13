

# Basics

> By the end of this article you should be able to

Deploy a Decentralized Lottery contract to the Rinkeby testnet that uses Quantum Randomness.

> Who is this tutorial for?

Developers with a basic understanding of the Solidity and Javascript languages that would like to try Web3. 


This is gonna be a lottery contract that anyone can enter. The user chooses a number 1-65535 and pays the ticket price. They revenue for the tickets is collected in the pot in the contract. After 7 days the contract will allow anyone to start the drawing. We will call on QRNG for a random number. The pot will be split between the users that chose that number. If there was no winners, the pot rolls over to the next week. 


1. Initiailize project

Create a folder and open it up in your IDE

```
npm init
```

2. Install hardhat

```
npm i -D hardhat
```

3. Initialize the HH project

```
npx hardhat
```
Follow the prompts for `Create a JavaScript project` and the rest default

> run tests
```
npx hardhat test
``` 


# Writing the contract

1. In the contract folder, create a file called `Lottery.sol`

2. Set the solidity version, found in the hardhat.config.js and start with an empty contract with an empty constructor for now

```solidity
pragma solidity ^0.8.9;

contract Lock {
    constructor() {}
}
```

3. Add globals

```solidity
contract Lottery {
    uint256 public pot = 0; // total amount of ether in the pot
    uint256 public ticketPrice = 0.01 ether; // price of a single ticket
    uint256 public week = 1; // current week counter
    uint256 public endTime; // datetime that current week ends and lottery is closable
    uint256 public constant MAX_NUMBER = 65535; // highest possible number returned by QRNG

    // Initialize the contract with a set day and time of the week winners can be chosen
    constructor(uint256 _endTime) {
        endTime = _endTime;
    }
```




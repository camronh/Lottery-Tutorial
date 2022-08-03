# Beginners Web3/Solidity/Blockchain Tutorial

In this tutorial we will be walking through building and deploying a decentralized lottery smart contract using Hardhat. In this decentralized app, or dApp, anyone can choose a number 1-10000 and pay the ticket price to enter. They revenue for the ticket sales is collected in the pot in the contract. After 7 days the contract will allow anyone to start the drawing. The contract will call the API3 QRNG for a random number. The pot will be split between all of the users that chose that number. If there was no winners, the pot rolls over to the next week.

> By the end of this tutorial you should be able to

Deploy a decentralized lottery smart contract to the Ropsten testnet that uses Quantum Randomness.

> Who is this tutorial for?

Developers with a basic understanding of the Solidity and Javascript languages that would like to expand their knowledge.

----
In Part 1, we create a centralized lottery smart contract. In Part 2, we decentralize our lottery by integrating the API3 QRNG. 

## [Part 1](https://github.com/camronh/Lottery-Tutorial/tree/Part1)
## [Part 2](https://github.com/camronh/Lottery-Tutorial/tree/Part2)
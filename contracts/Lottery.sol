// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Lottery {
    // Global Variables
    uint256 public pot = 0; // total amount of ether in the pot
    uint256 public ticketPrice = 0.01 ether; // price of a single ticket
    uint256 public week = 1; // current week counter
    uint256 public endTime; // datetime that current week ends and lottery is closable
    uint256 public constant MAX_NUMBER = 65535; // highest possible number returned by QRNG

    // Mappings
    mapping(uint256 => mapping(uint256 => address[])) public tickets; // mapping of week => entry number choice => list of addresses that bought that entry number
    mapping(uint256 => uint256) public winningNumber; // mapping to store each weeks winning number

    /// @notice Initialize the contract with a set day and time of the week winners can be chosen
    /// @param _endTime date and time when the lottery becomes closable
    constructor(uint256 _endTime) {
        endTime = _endTime;
    }
}

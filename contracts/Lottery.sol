// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Lottery {
    uint256 public pot = 0; // total amount of ether in the pot
    uint256 public ticketPrice = 0.01 ether; // price of a single ticket
    uint256 public week = 1; // current week counter
    uint256 public endTime; // datetime that current week ends and lottery is closable
    uint256 public constant MAX_NUMBER = 65535; // highest possible number returned by QRNG

    /// @notice Initializes the lottery with the given ticket price.
    /// @param _endTime The price of a single ticket.
    constructor(uint256 _endTime) {
        endTime = _endTime; // set end time
    }
}

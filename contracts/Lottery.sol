// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Lottery {
    // Global Variables
    uint256 public pot = 0; // total amount of ether in the pot
    uint256 public ticketPrice = 0.0001 ether; // price of a single ticket
    uint256 public week = 1; // current week counter
    uint256 public endTime; // datetime that current week ends and lottery is closable
    uint256 public constant MAX_NUMBER = 10000; // highest possible number

    // Errors
    error EndTimeReached(uint256 lotteryEndTime);

    // Mappings
    mapping(uint256 => mapping(uint256 => address[])) public tickets; // mapping of week => entry number choice => list of addresses that bought that entry number
    mapping(uint256 => uint256) public winningNumber; // mapping to store each weeks winning number

    /// @notice Initialize the contract with a set day and time of the week winners can be chosen
    /// @param _endTime date and time when the lottery becomes closable
    constructor(uint256 _endTime) {
        require(_endTime > block.timestamp, "End time must be in the future");
        endTime = _endTime; // store the end time of the lottery
    }

    /// @notice Buy a ticket for the current week
    /// @param _number The number to buy a ticket for
    function enter(uint256 _number) external payable {
        require(_number <= MAX_NUMBER, "Number must be 1-MAX_NUMBER"); // guess has to be between 1 and MAX_NUMBER
        if (block.timestamp >= endTime) revert EndTimeReached(endTime); // lottery has to be open
        require(msg.value == ticketPrice, "Ticket price is 0.0001 ether"); // user needs to send 0.0001 ether with the transaction
        tickets[week][_number].push(msg.sender); // add user's address to list of entries for their number under the current week
        pot += ticketPrice; // account for the ticket sale in the pot
    }

    /// @notice Close the current week and calculate the winners. Can be called by anyone after the end time has passed.
    /// @param _randomNumber To mock the random number that was generated by the QRNG
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
                payable(winners[i]).call{value: earnings}(""); // send earnings to each winner
            }
        }
    }

    /// @notice Read only function to get addresses entered into a specific number for a specific week
    /// @param _week The week to get the list of addresses for
    /// @param _number The number to get the list of addresses for
    function getEntriesForNumber(uint256 _number, uint256 _week)
        public
        view
        returns (address[] memory)
    {
        return tickets[_week][_number];
    }

    /// @notice Handles when funds are sent directly to the contract address
    receive() external payable {
        pot += msg.value; // add funds to the pot
    }
}

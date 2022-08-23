// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Lottery is RrpRequesterV0, Ownable {
    // Events
    event RequestedRandomNumber(bytes32 indexed requestId);
    event ReceivedRandomNumber(bytes32 indexed requestId, uint256 randomNumber);

    // Global Variables
    uint256 public pot = 0; // total amount of ether in the pot
    uint256 public ticketPrice = 0.0001 ether; // price of a single ticket
    uint256 public week = 1; // current week counter
    uint256 public endTime; // datetime that current week ends and lottery is closable
    uint256 public constant MAX_NUMBER = 10000; // highest possible number
    address public constant airnodeAddress =
        0x9d3C147cA16DB954873A498e0af5852AB39139f2;
    bytes32 public constant endpointId =
        0xfb6d017bb87991b7495f563db3c8cf59ff87b09781947bb1e417006ad7f55a78;
    address payable public sponsorWallet;

    // Errors
    error EndTimeReached(uint256 lotteryEndTime);

    // Mappings
    mapping(uint256 => mapping(uint256 => address[])) public tickets; // mapping of week => entry number choice => list of addresses that bought that entry number
    mapping(uint256 => uint256) public winningNumber; // mapping to store each weeks winning number
    mapping(bytes32 => bool) public pendingRequestIds; // mapping to store pending request ids

    /// @notice Initialize the contract with a set day and time of the week winners can be chosen
    /// @param _endTime Unix time when the lottery becomes closable
    constructor(uint256 _endTime, address _airnodeRrpAddress)
        RrpRequesterV0(_airnodeRrpAddress)
    {
        if (_endTime <= block.timestamp) revert EndTimeReached(_endTime);
        endTime = _endTime; // store the end time of the lottery
    }

    function setSponsorWallet(address payable _sponsorWallet)
        external
        onlyOwner
    {
        sponsorWallet = _sponsorWallet;
    }

    /// @notice Buy a ticket for the current week
    /// @param _number The participant's chosen lottery number for which they're buying a ticket
    function enter(uint256 _number) external payable {
        require(_number <= MAX_NUMBER, "Number must be 1-MAX_NUMBER"); // guess has to be between 1 and MAX_NUMBER
        if (block.timestamp >= endTime) revert EndTimeReached(endTime); // lottery has to be open
        require(msg.value == ticketPrice, "Ticket price is 0.0001 ether"); // user needs to send 0.0001 ether with the transaction
        tickets[week][_number].push(msg.sender); // add user's address to list of entries for their number under the current week
        pot += ticketPrice; // account for the ticket sale in the pot
    }

    /// @notice Request winning random number from Airnode
    function getWinningNumber() external payable {
        // require(block.timestamp > endTime, "Lottery has not ended"); // not available until end time has passed
        require(msg.value >= 0.01 ether, "Please top up sponsor wallet"); // user needs to send 0.01 ether with the transaction
        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnodeAddress,
            endpointId,
            address(this),
            sponsorWallet,
            address(this),
            this.closeWeek.selector,
            ""
        );
        pendingRequestIds[requestId] = true;
        emit RequestedRandomNumber(requestId);
        sponsorWallet.call{value: msg.value}(""); // Send funds to sponsor wallet
    }

    /// @notice Close the current week and calculate the winners. Can be called by anyone after the end time has passed.
    /// @param requestId the request id of the response from Airnode
    /// @param data payload returned by Airnode
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    struct Proposal {
        string name;
        uint256 voteCount;
    }

    struct VotingStats {
        uint256 totalVotes;
        uint256 totalVoters;
        uint256 startTime;
        bool isActive;
    }

    Proposal[] public proposals;
    mapping(address => bool) public voters;
    
    address public owner;
    VotingStats public stats;
    
    event VoteCast(address indexed voter, uint256 proposalId);
    event VotingStatusChanged(bool isActive);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier votingActive() {
        require(stats.isActive, "Voting is not active");
        _;
    }

    constructor(string[] memory _proposalNames) {
        owner = msg.sender;
        stats.startTime = block.timestamp;
        stats.isActive = true;
        
        for (uint i = 0; i < _proposalNames.length; i++) {
            proposals.push(Proposal({name: _proposalNames[i], voteCount: 0}));
        }
    }

    function vote(uint _proposalId) external votingActive {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        require(!voters[msg.sender], "Already voted");
        
        proposals[_proposalId].voteCount++;
        voters[msg.sender] = true;
        stats.totalVotes++;
        stats.totalVoters++;
        
        emit VoteCast(msg.sender, _proposalId);
    }

    function getProposals() external view returns (Proposal[] memory) {
        return proposals;
    }
    
    function getVotingStats() external view returns (VotingStats memory) {
        return stats;
    }
    
    function setVotingStatus(bool _isActive) external onlyOwner {
        stats.isActive = _isActive;
        emit VotingStatusChanged(_isActive);
    }
    
    function addProposal(string memory _name) external onlyOwner {
        proposals.push(Proposal({name: _name, voteCount: 0}));
    }
    
    function getWinningProposal() external view returns (Proposal memory) {
        require(proposals.length > 0, "No proposals exist");
        
        uint winningProposalId = 0;
        uint winningVoteCount = 0;
        
        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningProposalId = i;
            }
        }
        
        return proposals[winningProposalId];
    }
}
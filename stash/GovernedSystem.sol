pragma solidity 0.4.24;


import "./System.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


/** @title GovernedSystem
  * @author Luke Strgar
  * @dev System with fixed system proposal types and
  * fixed number of owners with governance vote
  */
contract GovernedSystem is System {

    using SafeMath for uint256;

    uint256 public constant A_WEEK = 604800;

    // Number of owners
    uint256 public numberOwners;

    // Proposal voting threshold
    uint256 public threshold;

    // Records if specific address is an owner
    mapping (address => bool) public isOwner;

    // Array of all owners
    address[] public ownersArr;

     // Proposal unique ID variable
    uint256 public proposalNum;

     // All proposals, mapped by ID
    mapping(uint256 => Proposal) public proposals;

    // Votes indexed by prop ID then by owner address
    mapping(uint256 => mapping(address => Vote)) public votes;

    // Enumeration of all prop types
    enum PropType {Collateral, Price, LiquidationRatio, InterestRate, LiquidationFee}	

    struct Proposal {
        PropType pType;
        bytes32 symbol; // Used as key in global dictionaries
        address addr; // Used as value in global dictionaries
        uint256 val; // Used as value in global dictionaries
        uint8 endorsements; // Number supporters
        uint8 oppositions; // Number opposers
        uint256 timeCreated; // Time proposed. Props invalid after 1 week
    }

    struct Vote {
        bool active; // Has voted
        bool inFavor;
    }

    // Resticts access to contract owners
    modifier ownerOnly() {
        require(isOwner[msg.sender]);
        _;
    }
    
    /** @dev Configures ownership
      * @param _owners Array of system owner's addresses
      */
    constructor(
        uint256 _numberOwners,
        uint256 _threshold,
        address[] _owners,
        uint256 _interestFee,
        uint256 _liquidationFee,
        uint256 _collateralDiscount,
        address _governance,
        uint256 duration,
        bytes32[] collateralTypes,
        address[] collateralTokens,
        uint256[] _liquidationRatios,
        bytes32 assetSym,
        bytes32 underlyingSym
    ) 
    public
    System(
        _interestFee,
        _liquidationFee,
        _collateralDiscount,
        _governance,
        duration,
        collateralTypes,
        collateralTokens,
        _liquidationRatios,
        assetSym,
        underlyingSym
    ) {
        require(_owners.length == _numberOwners);
        require(_threshold <= _numberOwners);

        numberOwners = _numberOwners;
        threshold = _threshold;

        for (uint i = 0; i < _owners.length; i++) {
            require(!isOwner[_owners[i]]);
            isOwner[_owners[i]] = true;
        }
        ownersArr = _owners;
    }

    /** @dev Reverts any funds and state changes.
      */
    function() public payable {
        revert();
    }

    /** @dev Implements proposal with sufficient votes.
      * @param propId Proposal identifier
      */
    function implementProposal(
        uint256 propId
    )
        external
    {
        require(proposals[propId].endorsements >= threshold);

        if (proposals[propId].pType == PropType.InterestRate) {
            interestRate = proposals[propId].val;
        }
    }

    /** @dev Rejects proposal if expired or sufficiently opposed.
      * @param propId Proposal identifier.
      */ 
    function rejectProposal(
        uint256 propId
    )
        external
    {
        require(proposals[propId].oppositions >= numberOwners.sub(threshold) || 
            proposals[propId].timeCreated.add(A_WEEK) >= now);

        deleteProposal(propId);
    }

    /** @dev Allows owner to propose new system interest rate
      * @param rate Proposed new interest rate.
      */ 
    function proposeInterestRate(
        uint256 rate
    )
        external
        ownerOnly
        returns (uint256)
    {
        return newProposal(
            PropType.InterestRate,
            bytes32("NULL"),
            address(0),
            rate
        );
    }

    /** @dev Allows owner to endorse existing proposal
      * @param propId Proposal identifier.
      */
    function endorseProposal(
        uint256 propId
    )
        external
        ownerOnly
    {
        require(!votes[propId][msg.sender].active);
        votes[propId][msg.sender] = Vote(true, true);
        proposals[propId].endorsements = proposals[propId].endorsements++;
    }

    /** @dev Allows owner to oppose existing proposal
        * @param propId Proposal identifier.
        */
    function opposeProposal(
        uint256 propId
    )
        external
        ownerOnly
    {
        require(!votes[propId][msg.sender].active);
        votes[propId][msg.sender] = Vote(true, false);
        proposals[propId].oppositions = proposals[propId].oppositions++;
    }

    /** @dev Allows owner to flip their standing vote on a proposal
        * @param propId Proposal identifier.
        */
    function flipVote(
        uint256 propId
    )
        external
        ownerOnly
    {
        require(votes[propId][msg.sender].active);
        bool newVote = !(votes[propId][msg.sender].inFavor);
        votes[propId][msg.sender].inFavor = newVote;
    }

    /** @dev Deletes proposal storage space
      * @param propId Proposal identifier.
      */
    function deleteProposal(
        uint256 propId
    )
        private
    {
        delete proposals[propId];
        for (uint256 i = 0; i < numberOwners; i++) {
            delete votes[propId][ownersArr[i]];
        }
    }

    /** @dev Structures new proposal putting it up for vote
      * @param pType Proposal type.
      * @param symbol Relevant data.
      * @param addr Relevant data.
      * @param val Relevant data.
      */
    function newProposal(
        PropType pType,
        bytes32 symbol,
        address addr,
        uint256 val
    )
        private
        returns (uint256)
    {
        proposalNum = proposalNum.add(1);
        proposals[proposalNum] = Proposal(
            pType,
            symbol,
            addr,
            val,
            1,
            0,
            block.timestamp
        );
        votes[proposalNum][msg.sender] = Vote(true, true);
        return proposalNum;
    }
}

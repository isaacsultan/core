//solhint-disable indent
pragma solidity ^0.5.0;  

import "openzeppelin-solidity/contracts/access/Roles.sol";
import "./Math.sol";


contract ManagingDirector {

    using Roles for Roles.Role;
    Roles.Role private adminRole;
    Roles.Role private brokerRole;

    constructor(bytes32 _assetClass, address _adminRole, address _brokerRole) public {
        assetClass = _assetClass;
        adminRole.add(_adminRole);
        brokerRole.add(_brokerRole);
    }

    struct Agreement {
        bytes32 product; 
        bytes32[] collateralTypes;
        uint256 productDebt;
        uint256 targetPrice; 
        uint256 underlyingPrice;
    }

    bytes32 public assetClass;
    uint256 public agreementId;
    
    mapping (uint256 => Agreement) public agreements;
    mapping (uint256 => address) public agreementOwner; 
    mapping (uint256 => mapping(bytes32 => uint256)) public agreementCollateralAmount;
    mapping (uint256 => mapping(bytes32 => uint256)) public collateralPosition; //TODO: refactor
    mapping (bytes32 => mapping(bytes32 => uint256)) public clientCollateral;
    
    // --- Administration ---

    function modifyClientCollateralBalance(
        bytes32 _collateral, 
        bytes32 _address, 
        int256 _amount
    ) 
        public 
    {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        clientCollateral[_address][_collateral] = DSMath.add(clientCollateral[_address][_collateral], _amount);
    }

    // --- Agreement ---
    event ManagingDirectorSender(address);
    function originateAgreement(
        bytes32 _product,
        address _owner
    )
        public 
        returns (uint)
    {
        emit ManagingDirectorSender(msg.sender);
        require(brokerRole.has(msg.sender), "DOES_NOT_HAVE_BROKER_ROLE");
        Agreement storage agree = agreements[agreementId];
        agree.product = _product;
        agreementOwner[agreementId] = _owner;

        return agreementId++;
    }

    function modifyAgreementCollateral(
        uint _id, 
        bytes32 _collateral, 
        int256 _amount
    ) 
        public 
    {
        require(brokerRole.has(msg.sender), "DOES_NOT_HAVE_BROKER_ROLE");
        Agreement storage agree = agreements[_id];
        if (_amount > 0 && agreementCollateralAmount[_id][_collateral] == 0) {
            addCollateralToAgreement(agree, _id, _collateral);
        }
        uint256 newAmount = DSMath.add(agreementCollateralAmount[_id][_collateral], _amount);
        agreementCollateralAmount[_id][_collateral] = newAmount;

        assert(newAmount >= 0);
        if (newAmount == 0) {
            deleteCollateralFromAgreement(agree, _id, _collateral);
        }
    }

    function mintAgreementProduct(uint _id, uint256 _amount, uint256 _targetPrice, uint256 _underlyingPrice) public {
        require(brokerRole.has(msg.sender), "DOES_NOT_HAVE_BROKER_ROLE");
        Agreement storage agree = agreements[_id];
        agree.targetPrice = _targetPrice; 
        agree.underlyingPrice = _underlyingPrice; 
        agree.productDebt = _amount;
    }

    function resetAgreement(
        uint256 _agreementId, 
        uint256 _newDebt, 
        uint256 _targetPrice, 
        uint256 _underlyingPrice
    ) 
        public 
    {
        require(brokerRole.has(msg.sender), "DOES_NOT_HAVE_BROKER_ROLE");
        Agreement storage agree = agreements[_agreementId];
        agree.productDebt = _newDebt;
        agree.targetPrice = _targetPrice;
        agree.underlyingPrice = _underlyingPrice;
    }




    // /// TODO PER LIQUIDATION CONTRACT IMPLEMENTATION
    // function liquidateAgreement(uint _id) public {
    //     Agreement storage agree = agreements[_id];
    //     agree.productDebt = 0;

    //     for (uint i = 0; i < agree.collateralTypes.length; i++) {
    //         agreementCollateralAmount[_id][agree.collateralTypes[i]] = 0;
    //     }
    // }



    // --- Private Helpers ---
    // TODO: https://medium.com/@robhitchens/solidity-crud-part-2-ed8d8b4f74ec
    function deleteCollateralFromAgreement(
        Agreement storage _agree, 
        uint _id, 
        bytes32 _type
    ) 
        private 
    {
        delete _agree.collateralTypes[collateralPosition[_id][_type]];
    }

    function addCollateralToAgreement(
        Agreement storage _agree, 
        uint _id, 
        bytes32 _type
    ) 
        private 
    {
        _agree.collateralTypes.push(_type);
        collateralPosition[_id][_type] = _agree.collateralTypes.length;
    }

}
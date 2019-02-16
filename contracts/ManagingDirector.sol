/*

    Copyright 2019 Partial f

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

*/

//solhint-disable indent
pragma solidity ^0.5.0;  

import "openzeppelin-solidity/contracts/access/Roles.sol";
import "./Math.sol";


contract ManagingDirector {

    using Roles for Roles.Role;
    Roles.Role private adminRole;
    Roles.Role private brokerRole; //TODO: Rename

    constructor(bytes32 _assetClass, address _adminRole) public {
        assetClass = _assetClass;
        adminRole.add(_adminRole);
    }

    struct Agreement {
        bytes32 product; 
        uint256 productDebt; // wad
        uint256 targetPrice; // wad
        uint256 underlyingPrice; // wad
    }

    bytes32 public assetClass;
    uint256 public agreementId;
    
    mapping (uint256 => Agreement) public agreements;
    mapping (uint256 => address) public agreementOwner; 
    mapping (uint256 => mapping(bytes32 => uint256)) public agreementCollateral; // wad
    mapping (address => mapping(bytes32 => uint256)) public clientCollateral; // wad

    // --- Administration ---
    function addBrokerRole(address _brokerRole) external {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        brokerRole.add(_brokerRole);
    }

    // --- Collateral ---
    function increaseClientCollateralBalance(
        address _address, 
        bytes32 _collateral, 
        uint _amount
    ) 
        public 
    {
        require(brokerRole.has(msg.sender), "DOES_NOT_HAVE_BROKER_ROLE");
        clientCollateral[_address][_collateral] = DSMath.add(clientCollateral[_address][_collateral], _amount);
    }

    function decreaseClientCollateralBalance(
        address _address, 
        bytes32 _collateral, 
        uint _amount
    ) 
        public 
    {
        require(brokerRole.has(msg.sender), "DOES_NOT_HAVE_BROKER_ROLE");
        clientCollateral[_address][_collateral] = DSMath.sub(clientCollateral[_address][_collateral], _amount);
    }

    function modifyAgreementOwner(
        uint _agreementId,
        address _to
    ) public {
        require(brokerRole.has(msg.sender), "DOES_NOT_HAVE_BROKER_ROLE");
        agreementOwner[_agreementId] = _to;
    }

    // --- Agreement ---
    function originateAgreement(
        address _owner,
        bytes32 _product
    )
        public 
        returns (uint)
    {
        require(brokerRole.has(msg.sender), "DOES_NOT_HAVE_BROKER_ROLE");
        Agreement storage agree = agreements[agreementId];
        agree.product = _product;
        agreementOwner[agreementId] = _owner;

        return agreementId++;
    }

    function increaseAgreementCollateral(
        uint _id, 
        bytes32 _collateral, 
        uint _amount
    ) 
        public 
    {
        require(brokerRole.has(msg.sender), "DOES_NOT_HAVE_BROKER_ROLE");
        
        uint256 newAmount = DSMath.add(agreementCollateral[_id][_collateral], _amount);
        agreementCollateral[_id][_collateral] = newAmount;
    }

    function decreaseAgreementCollateral(
        uint _id, 
        bytes32 _collateral, 
        uint _amount
    ) 
        public 
    {
        require(brokerRole.has(msg.sender), "DOES_NOT_HAVE_BROKER_ROLE");

        uint256 newAmount = DSMath.sub(agreementCollateral[_id][_collateral], _amount);
        agreementCollateral[_id][_collateral] = newAmount;

    }

    function mintAgreementProduct(uint _id, uint _amount, uint _targetPrice, uint _underlyingPrice) public {
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
}

    // /// TODO PER LIQUIDATION CONTRACT IMPLEMENTATION
    // function liquidateAgreement(uint _id) public {
    //     Agreement storage agree = agreements[_id];
    //     agree.productDebt = 0;

    //     for (uint i = 0; i < agree.collateralTypes.length; i++) {
    //         agreementCollateralAmount[_id][agree.collateralTypes[i]] = 0;
    //     }
    // }

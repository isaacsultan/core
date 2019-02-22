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
import "./Economics.sol";


contract IManagingDirector {
    function originateAgreement(address, bytes32) public returns (uint);
    function increaseAgreementCollateral(uint256, bytes32, uint) public;
    function decreaseAgreementCollateral(uint256, bytes32, uint) public;
    function collaterals(bytes32) public view returns (uint256, uint256, uint256);
    function productToUnderlying(bytes32) public view returns (bytes32);
    function agreements(uint256) public view returns (bytes32, uint, uint, uint);
    function modifyAgreementOwner(uint, address) public;
    function agreementOwner(uint) public view returns (address);
}

contract IAdvancedTokenFactory {
    function advancedTokens(uint) public view returns (IERC777);
}


contract IERC777 {
    function authorizeOperator(address) public;
}


contract ICompliance {
    function collateralizationParams(uint) public returns (uint, uint);
    function collateralizationParamsAfterChange(uint, bytes32, uint) public returns (uint, uint);
    function approvedCollaterals(bytes32) public view returns (bool);
}


contract IErc20TellerFactory {
    function contracts(bytes32) public view returns (address);
}


contract IErc20Teller {
    function deposit(address _sender, uint _amount) public;
    function withdraw(address _sender, uint _amount) public;}


contract IEthTeller {
    function deposit(address _sender) public payable;
    function withdraw(address payable _sender, uint _amount) public;
}


contract Broker {

    using Roles for Roles.Role;
    Roles.Role private adminRole;

    IManagingDirector public managingDirector;
    IAdvancedTokenFactory public advancedTokenFactory;
    ICompliance public compliance;
    uint256 public offerFee;
    IEthTeller public ethTeller;
    IErc20TellerFactory public erc20TellerFactory;

    mapping (bytes32 => bytes32) public productToUnderlying;

    event ProductDebt(uint, int);
    event NewProductType(bytes32 productType, bytes32 underlyingType);
    event NewAgreement(address client, uint id, bytes32 product);
    event AgreementTransfer(uint id, address from, address to);
    event CollateralOffer(address client, uint id, bytes32 collateral, uint amount);
    event CollateralWithdraw(address client, uint id, bytes32 collateral, uint amount);

    constructor(address _managingDirector, address _btFactory, address _compliance, address _ethTeller, address _erc20TellerFactory, address _adminRole) public {
        managingDirector = IManagingDirector(_managingDirector);
        advancedTokenFactory = IAdvancedTokenFactory(_btFactory);
        compliance = ICompliance(_compliance);
        ethTeller = IEthTeller(_ethTeller);
        erc20TellerFactory = IErc20TellerFactory(_erc20TellerFactory);
        adminRole.add(_adminRole);
    }

    function approveProduct(bytes32 _productType, bytes32 _underlyingType) public {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        productToUnderlying[_productType] = _underlyingType;
        emit NewProductType(_productType, _underlyingType);
    }

    function agree(bytes32 _product) public returns (uint) {
        require(productToUnderlying[_product] != 0, "Product is unapproved");
        uint agreementId = managingDirector.originateAgreement(msg.sender, _product);
        advancedTokenFactory.advancedTokens(0).authorizeOperator(msg.sender);  //TODO
        emit NewAgreement(msg.sender, agreementId, _product);
        return agreementId;
    }

    function transferOwnership(uint _agreementId, address _to) public {
        require(msg.sender == managingDirector.agreementOwner(_agreementId), "User does not own agreement");
        managingDirector.modifyAgreementOwner(_agreementId, _to);
        emit AgreementTransfer(_agreementId, msg.sender, _to);
    }

    event Break1();
    event Break2();

    function offerCollateral(uint _agreementId, bytes32 _collateralType, uint _collateralChange) public payable { //TODO: return excess collateral?
        require(compliance.approvedCollaterals(_collateralType), "Collateral is Unapproved");
        require(managingDirector.agreementOwner(_agreementId) != address(0), "Invalid agreementId");

        (, uint productDebt, , ) = managingDirector.agreements(_agreementId);
        if (productDebt != 0) {
            (uint liquidationRatio, uint totalCollateralValue) = compliance.collateralizationParams(_agreementId);
            require(Economics.collateralized(liquidationRatio, totalCollateralValue, productDebt) == false, "Agreement is fully collateralized");
        }
        if (_collateralType == "ETH") {
            ethTeller.deposit.value(msg.value)(msg.sender);
            managingDirector.increaseAgreementCollateral(_agreementId, _collateralType, msg.value);
            emit CollateralOffer(msg.sender, _agreementId, _collateralType, msg.value);
        } else {
            IErc20Teller(erc20TellerFactory.contracts(_collateralType)).deposit(msg.sender, _collateralChange);
            managingDirector.increaseAgreementCollateral(_agreementId, _collateralType, _collateralChange);
            emit CollateralOffer(msg.sender, _agreementId, _collateralType, _collateralChange);
        }
    }

    function withdrawCollateral(uint _agreementId, bytes32 _collateralType, uint _collateralChange) public { 
        //require(msg.sender == managingDirector.agreementOwner(_agreementId), "Agreement not owned by client");

        //(, uint productDebt, , ) = managingDirector.agreements(_agreementId);
        //(uint liquidationRatio, uint totalCollateralValue) = compliance.collateralizationParamsAfterChange(_agreementId, _collateralType, _collateralChange);
        //require(Economics.collateralized(liquidationRatio, totalCollateralValue, productDebt), "Withdrawal does not maintain agreement collateralization");

        if (_collateralType == "ETH") {
            ethTeller.withdraw(msg.sender, _collateralChange);
        } else {
            IErc20Teller(erc20TellerFactory.contracts(_collateralType)).withdraw(msg.sender, _collateralChange);
        }

        managingDirector.decreaseAgreementCollateral(_agreementId, _collateralType, _collateralChange);
        emit CollateralWithdraw(msg.sender, _agreementId, _collateralType, _collateralChange);
    }
}
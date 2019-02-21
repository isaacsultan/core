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

import "./Math.sol";
import "./Economics.sol";
import "openzeppelin-solidity/contracts/access/Roles.sol";


contract IToken {
    function operatorBurn(address, uint256, bytes memory, bytes memory) public;
    function operatorSend(address, address, uint256, bytes memory, bytes memory) public;
    function mint(address, uint256, bytes memory) public;
}


contract IManagingDirector {
    function resetAgreement(uint, uint, uint, uint) public;
    function agreements(uint) public view returns (bytes32, uint, uint, uint);
    function liquidateAgreement(uint) public;
    function collaterals(bytes32) public view returns (uint, uint, uint);
    function modifyAgreementProduct(uint, uint256) public;
    function agreementCollateralAmount(uint, bytes32) public view returns (uint);
}


contract IBroker {
    function productToUnderlying(bytes32) public view returns (bytes32);
}


contract ITicker {
    function getPrice(bytes32) public returns (uint256);
}


contract ILiquidator {
    function resetTime(uint) public view returns (uint);
}


contract ICompliance {
    function collateralizationParams(uint _agreementId) public returns (uint, uint); 
}


contract ProductTellerFactory {
    using Roles for Roles.Role;
    Roles.Role private adminRole;
    
    ProductTeller[] public productTellers;
    mapping(address => bool) public productTellerRegistry;

    constructor(address _adminRole) public {
        adminRole.add(_adminRole);
    }

    event NewProductTeller(bytes32 productType, address productToken);

    function makeProductTeller(
        bytes32 _productType,
        address _managingDirector,
        address _broker,
        address _product,
        address _delta,
        address _ticker,
        address _liquidator,
        address _compliance,
        address _adminRole
    ) public {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        ProductTeller newContract = new ProductTeller
        (   
            _productType,
            _managingDirector,
            _broker,
            _product,
            _delta,
            _ticker,
            _liquidator,
            _compliance,
            _adminRole
        );
        productTellers.push(newContract);
        productTellerRegistry[address(newContract)] = true;
        emit NewProductTeller(_productType, _product);
    }

    function verify(address contractAddress) public view returns (bool) {
        return productTellerRegistry[contractAddress];
    }
}


contract ProductTeller {

    using Roles for Roles.Role;
    Roles.Role private adminRole;
    
    uint productFee; //ray
    
    bytes32 public productType;
    IManagingDirector public managingDirector;
    IToken public product;
    IToken public delta;
    ITicker public ticker;
    ILiquidator public liquidator;
    ICompliance public compliance;
    IBroker public broker;

    event ProductWithdraw(bytes32 productType, address client, uint agreementId, uint amount, uint feePaid);
    event ProductPay(bytes32 productType, address client, uint agreementId, uint amount);

    constructor
    (
        bytes32 _productType,
        address _managingDirector,
        address _broker,
        address _product,
        address _delta,
        address _ticker,
        address _liquidator,
        address _compliance,
        address _adminRole
    ) public {
        productType = _productType;
        managingDirector = IManagingDirector(_managingDirector);
        delta = IToken(_delta);
        product = IToken(_product);
        ticker = ITicker(_ticker);
        liquidator = ILiquidator(_liquidator);
        broker = IBroker(_broker);
        compliance = ICompliance(_compliance);
        adminRole.add(_adminRole);
    }

    function setProductFee(uint _productFee) public {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        productFee = _productFee;
    }

    function withdraw(uint256 _agreementId, uint256 _amount) public {
        (, uint pd, uint tp,) =
            managingDirector.agreements(_agreementId);
        require(pd == 0, "Product already minted");

         (uint liquidationRatio, uint totalCollateralValue) = compliance.collateralizationParams(_agreementId);
        require(Economics.collateralized(liquidationRatio, totalCollateralValue, _amount), "Uncollateralized!");

        uint deltaFee = DSMath.rmul(DSMath.rmul(_amount, tp), productFee);
        delta.operatorBurn(msg.sender, deltaFee, "", ""); 
        
        product.mint(msg.sender, _amount, "");
        managingDirector.modifyAgreementProduct(_agreementId, _amount);
        
        emit ProductWithdraw(productType, msg.sender, _agreementId, _amount, deltaFee);
    }

    function pay(uint256 _agreementId, uint256 _amount) public {
        
        (bytes32 pt, uint pd, uint tp, uint up) =
            managingDirector.agreements(_agreementId);

        uint256 newTargetPrice = ticker.getPrice(pt);
        uint256 newUnderlyingPrice = ticker.getPrice(broker.productToUnderlying(pt));
            
        uint256 dd = Economics.dynamicDebt(up, newUnderlyingPrice, tp, newTargetPrice, pd);
        uint256 diff = DSMath.sub(dd, _amount); 
        product.operatorBurn(msg.sender, _amount, "", "");
        delta.operatorBurn(msg.sender, _amount, "", ""); //TODO: Check

        if (diff > 0) {
            liquidator.resetTime(_agreementId);
            managingDirector.resetAgreement(_agreementId, diff, newTargetPrice, newUnderlyingPrice);
        } else {
           managingDirector.liquidateAgreement(_agreementId);
        }
        emit ProductPay(productType, msg.sender, _agreementId, _amount);
    }

}

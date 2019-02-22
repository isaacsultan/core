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

contract IManagingDirector {
    function agreements(uint) public view returns (bytes32, uint, uint, uint);
    function agreementCollateral(uint, bytes32) public view returns (uint);
}


contract ITicker {
    function getPrice(bytes32) public returns (uint256);
}


contract Compliance {

    using Roles for Roles.Role;
    Roles.Role private adminRole;

    IManagingDirector public managingDirector;
    ITicker public ticker;

    struct Collateral {
        bytes32 name;
        uint ratio; // ray
    }

    Collateral[] public collaterals;
    
    event CollateralizationParameters(uint id, uint liquidationRatio, uint totalCollateralValue, uint denom);

    constructor(address _managingDirector, address _ticker, address _adminRole) public {
        managingDirector = IManagingDirector(_managingDirector);
        ticker = ITicker(_ticker);
        adminRole.add(_adminRole);
    }

    function addCollateralType(bytes32 _type, uint _ratio) external {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        Collateral memory collateral = Collateral(_type, _ratio);
        collaterals.push(collateral);
    }

    function collateralizationParams(uint _agreementId) public returns (uint, uint) {
        uint totalCollateralValue;
        uint denom;
        for (uint i = 0; i < collaterals.length; i++) {
            Collateral memory clt = collaterals[i];

            if (managingDirector.agreementCollateral(_agreementId, clt.name) > 0) {
                (uint price, uint value) = collateralValue(_agreementId, clt.name);
                emit CollateralDetails(clt.name, price, value, clt.ratio);
                denom = DSMath.add(denom, DSMath.rdiv(price, clt.ratio));
                totalCollateralValue = DSMath.add(totalCollateralValue, value); 
            }
        }
        uint liquidationRatio = denom != 0 ? DSMath.rdiv(totalCollateralValue, denom) : 0;
        
        emit CollateralizationParameters(_agreementId, liquidationRatio, totalCollateralValue, denom);
        return (liquidationRatio, totalCollateralValue);
    }

    function collateralizationParamsAfterChange(uint _agreementId, bytes32 _collateralType, uint _amount) 
    public
    returns (uint, uint) {
        uint totalCollateralValue;
        uint denom;
        uint price;
        uint value;
        for (uint i = 0; i < collaterals.length; i++) {
            Collateral memory clt = collaterals[i];
            if (managingDirector.agreementCollateral(_agreementId, clt.name) > 0) {

                if (clt.name == _collateralType) {
                    (price, value) = collateralValueAfterChange(_agreementId, clt.name, _amount);
                } else {
                    (price, value) = collateralValue(_agreementId, clt.name);
                }

                denom = DSMath.add(denom, DSMath.rdiv(price, clt.ratio));
                totalCollateralValue = DSMath.add(totalCollateralValue, value); 
            }
        }
        uint liquidationRatio = denom != 0 ? DSMath.rdiv(totalCollateralValue, denom) : 0;
        emit CollateralizationParameters(_agreementId, liquidationRatio, totalCollateralValue, denom);

        return (liquidationRatio, totalCollateralValue);
    }


    function collateralValue(uint _agreementId, bytes32 _collateral) internal returns (uint, uint) {
        uint quantity = managingDirector.agreementCollateral(_agreementId, _collateral);

        uint price = ticker.getPrice(_collateral); 
        uint value = DSMath.mul(quantity, price);

        return (price, value);
    }

     function collateralValueAfterChange(uint _agreementId, bytes32 _collateral, uint _change) internal returns (uint, uint) {
        uint quantity = managingDirector.agreementCollateral(_agreementId, _collateral);
        uint newQuantity = DSMath.sub(quantity, _change);

        uint price = ticker.getPrice(_collateral); 
        uint value = DSMath.mul(newQuantity, price);

        return (price, value);
    }
}
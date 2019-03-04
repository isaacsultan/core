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
import "./LibCLL.sol";
import "./Math.sol";


contract ITicker {
    function getPrice(bytes32) public returns (uint);
}


contract IManagingDirector {
    function decreaseClientCollateralBalance(uint256, bytes32, uint) public;
    function decreaseAgreementCollateral(uint256, bytes32, uint) public;
}

contract IErc20 {
    function transfer(address, uint256) public returns (bool);
    function transferFrom(address, address, uint) public returns (bool);
}


contract Erc20TradingFloorFactory {
    using Roles for Roles.Role;
    Roles.Role private adminRole;

    Erc20TradingFloor[] public erc20TradingFloors;
    mapping(bytes32 => Erc20TradingFloor) public collateralToErc20TradingFloor;
    mapping(address => bool) public erc20TradingFloorRegistry;

    event NewTradingFloor();

    constructor(address _adminRole) public {
        adminRole.add(_adminRole);
    }

    function makeErc20TradingFloor(bytes32 _collateralType, address _collateralToken, address _managingDirector, address _ticker) public {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        Erc20TradingFloor newContract = new Erc20TradingFloor(_collateralType, _collateralToken, _managingDirector, _ticker);
        erc20TradingFloors.push(newContract);
        erc20TradingFloorRegistry[address(newContract)] = true;
        collateralToErc20TradingFloor[_collateralType] = newContract;
        emit NewTradingFloor();
    }

    function verify(address contractAddress) public view returns (bool) {
        return erc20TradingFloorRegistry[contractAddress];
    }
}

/*
contract EthTradingFloor {
    using LibCLLu for LibCLLu.CLL;

    IManagingDirector public managingDirector;
    ITicker public ticker;
    LibCLLu.CLL public list;
    Liquidation[] public liquidations;
    uint public liquidationCounter;

    struct Liquidation {
        uint id;
        uint amount;
    }

    constructor(address _managingDirector, address _ticker) public {
        managingDirector = IManagingDirector(_managingDirector);
        ticker = ITicker(_ticker);
    }

    function addToPool(uint _id, uint _amount) public {
        liquidations[liquidationCounter] = Liquidation(_id, _amount);
        list.push(liquidationCounter, true);
        liquidationCounter = liquidationCounter + 1;
    }

    function buyFromPool(uint _amount) public payable {
        uint pooledAmount = 0;
        while (pooledAmount < _amount) {
            Liquidation memory liquidation = list.step(true);
            int difference = int((liquidation.amount).sub(_amount));
            if (difference >= 0) {
                collateral.transfer(msg.sender, _amount);
                managingDirector.decreaseAgreementCollateral(liquidation.id, collateralType, _amount);
                managingDirector.decreaseClientCollateralBalance(liquidation.id, collateralType, _amount);
                liquidation.amount = liquidation.amount.sub(_amount);
                if (difference == 0) {
                    list.pop(true);
                }
                break;
            } else {
                pooledAmount = pooledAmount.add(liquidation.amount);
                managingDirector.decreaseAgreementCollateral(liquidation.id, collateralType, _amount);
                managingDirector.decreaseClientCollateralBalance(liquidation.id, collateralType, _amount);
                list.pop(true);
            }
        }
        collateral.transfer(msg.sender, pooledAmount);
    }
}
*/

contract Erc20TradingFloor {
    using LibCLLu for LibCLLu.CLL;

    IManagingDirector public managingDirector;
    ITicker public ticker;
    bytes32 public collateralType;
    IErc20 public collateralToken;
    LibCLLu.CLL private list;
    Liquidation[] public liquidations;
    uint public liquidationCounter;

    struct Liquidation {
        uint id;
        uint amount;
    }

    constructor(bytes32 _collateralType, address _collateralToken, address _managingDirector, address _ticker) public {
        collateralType = _collateralType;
        collateralToken = IErc20(_collateralToken);
        managingDirector = IManagingDirector(_managingDirector);
        ticker = ITicker(_ticker);
    }

    function addToPool(uint _id, uint _amount) public {
        liquidations[liquidationCounter] = Liquidation(_id, _amount);
        list.push(liquidationCounter, true);
        liquidationCounter = DSMath.add(liquidationCounter, 1);
    }

    function buyFromPool(uint _amount) public payable {
        require(msg.value > 0, "Must send Ether to buy from pool");
        uint pooledAmount = 0;
        uint ethPrice = ticker.getPrice("ETH");
        uint collateralPrice = ticker.getPrice(collateralType);
        uint amountAfforded = DSMath.wdiv(DSMath.wmul(ethPrice, msg.value), collateralPrice);
        while (pooledAmount < amountAfforded) {
            Liquidation memory liquidation = liquidations[list.step(liquidationCounter, true)];
            if (liquidation.amount >= amountAfforded) {
                require(collateralToken.transfer(msg.sender, _amount));
                managingDirector.decreaseAgreementCollateral(liquidation.id, collateralType, amountAfforded);
                managingDirector.decreaseClientCollateralBalance(liquidation.id, collateralType, amountAfforded);
                liquidation.amount = DSMath.sub(liquidation.amount, amountAfforded);
                if (liquidation.amount == amountAfforded) {
                    list.pop(true);
                }
                break;
            } else {
                pooledAmount = DSMath.add(pooledAmount, liquidation.amount);
                managingDirector.decreaseAgreementCollateral(liquidation.id, collateralType, amountAfforded);
                managingDirector.decreaseClientCollateralBalance(liquidation.id, collateralType, amountAfforded);
                list.pop(true);
            }
        }
        require(collateralToken.transfer(msg.sender, pooledAmount));
    }
}
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

pragma solidity ^0.5.0;


contract IManagingDirector {
    function agreements(uint) public view returns (bytes32, uint, uint, uint);
    function agreementCollateral(uint, bytes32) public view returns (uint);
    function liquidateAgreement(uint) public;
}


contract ITradingFloorFactory {
    function tradingFloors(bytes32) public view returns (address);
    function collateralToTradingFloor(bytes32) public view returns (address);
}


contract IErc20TradingFloor {
    function addToPool(uint, uint) public;
}


contract IEthTradingFloor {
    function addToPool(uint, uint) public;
}


contract IErc20TradingFloorFactory {
    function collateralToErc20TradingFloor(bytes32) public view returns (IErc20TradingFloor);
}


contract Liquidator {

    IManagingDirector public managingDirector;
    IErc20TradingFloorFactory public erc20TradingFloorFactory;
    IEthTradingFloor public ethTradingFloor;

    bytes32[] public collaterals;
    mapping(uint256 => uint256) public liquidationTimes;

    event ResetLiquidaton(uint agreementId, uint time);

    constructor(address _managingDirector, address _tradingFloorFactory, address _ethTradingFloor)
    public {
        managingDirector = IManagingDirector(_managingDirector);
        ethTradingFloor = IEthTradingFloor(_ethTradingFloor);
        erc20TradingFloorFactory = IErc20TradingFloorFactory(_tradingFloorFactory);
    }

    function resetTime(uint agreementId) public {
        liquidationTimes[agreementId] = now;
        emit ResetLiquidaton(agreementId, now);
    }

    function initiateLiquidation(uint256 _id) public {
        for (uint i = 0; i < collaterals.length; i++) {
            bytes32 collateral = collaterals[i];
            uint amount = managingDirector.agreementCollateral(_id, collateral);
            if (amount > 0) {
                if (collateral == "ETH") {
                    ethTradingFloor.addToPool(_id, amount);
                } else {
                    IErc20TradingFloor(erc20TradingFloorFactory.collateralToErc20TradingFloor(collateral)).addToPool(_id, amount);
                }
            }
        }
    }
}

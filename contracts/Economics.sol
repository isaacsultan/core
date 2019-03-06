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


library Economics {

    uint public constant WAD = 10 ** 18;
    uint public constant RAY = 10 ** 27;

    function collateralized(
        uint256 liquidationRatio,
        uint256 collateralBalance,
        uint256 productDebt
    ) 
        internal
        pure 
        returns (bool)
    {
        return liquidationRatio <= DSMath.ray((DSMath.wdiv(collateralBalance, productDebt))); 
    }

     function dynamicDebt
    (
        uint256 up,
        uint256 _newUp,
        uint256 tp, 
        uint256 _newTp, 
        uint256 _productDebt
    )
        internal
        pure
        returns (uint)
    {
        
        uint changeInUnderlying = DSMath.wdiv(_newUp, up);
        uint changeInTarget = DSMath.wdiv(_newTp, tp);
        uint numerator = DSMath.add(WAD, DSMath.wmul(2*WAD, DSMath.sub(WAD, changeInUnderlying)));

        uint debt = DSMath.wmul(_productDebt, DSMath.wdiv(numerator, changeInTarget));
        return debt;
    }
}

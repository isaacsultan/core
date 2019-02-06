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
        return liquidationRatio >= DSMath.ray((DSMath.wdiv(collateralBalance, productDebt))); 
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

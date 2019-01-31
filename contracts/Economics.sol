//solhint-disable indent
pragma solidity ^0.5.0;

import "./Math.sol";


library Economics {

    uint constant RAY = 10 ** 27;

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
        
        uint changeInUnderlying = DSMath.rdiv(_newUp, up);
        uint changeInTarget = DSMath.rdiv(_newTp, tp);
        uint numerator = DSMath.add(1 ** RAY, DSMath.wmul(2**RAY, DSMath.sub(1**RAY, changeInUnderlying)));

        uint debt = DSMath.rmul(_productDebt, DSMath.rdiv(numerator, changeInTarget));
        return debt;
    }
}

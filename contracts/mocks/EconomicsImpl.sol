//solhint-disable indent
pragma solidity ^0.5.0;

import "../Economics.sol";


contract EconomicsImpl {
    
    function collateralized(
        uint256 liquidationRatio,
        uint256 collateralBalance,
        uint256 productDebt
    )
    public pure returns (bool)
    {
        return Economics.collateralized(liquidationRatio, collateralBalance, productDebt);
    }

    function dynamicDebt
    (
        uint256 up,
        uint256 _newUp,
        uint256 tp, 
        uint256 _newTp, 
        uint256 _productDebt
    )
        public
        pure
        returns (uint)
    {
        return Economics.dynamicDebt(up, _newUp, tp, _newTp, _productDebt);
    }
}
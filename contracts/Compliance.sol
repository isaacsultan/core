//solhint-disable indent
pragma solidity ^0.5.0;

import "./Math.sol";


contract IManagingDirector {

    function collaterals(bytes32) public view returns (uint, uint, uint);
    function agreements(uint) public view returns (bytes32, uint, uint, uint);
    function agreementCollateral(uint, bytes32) public view returns (uint);
    function collaterals() public view returns (bytes32[] memory, uint[] memory);
}


contract ITicker {
    function getPrice(bytes32) public returns (uint256);
}


contract Compliance {
    IManagingDirector public managingDirector;
    ITicker public ticker;

    constructor(address _managingDirector, address _ticker) public {
        managingDirector = IManagingDirector(_managingDirector);
        ticker = ITicker(_ticker);
    }

    function collateralizationParams(uint _agreementId) public returns (uint, uint) {
        (bytes32[] memory cltNames, uint[] memory cltRatios) = managingDirector.collaterals();
        uint totalCollateralValue; 
        uint denom;
        for (uint i = 0; i < cltNames.length; i++) {
            if (managingDirector.agreementCollateral(_agreementId, cltNames[i]) > 0) {
                (uint price, uint value) = collateralValue(_agreementId, cltNames[i]);
                denom = DSMath.add(denom, DSMath.rdiv(price, cltRatios[i]));
                totalCollateralValue = DSMath.add(totalCollateralValue, value); 
            }
        }
        uint liquidationRatio = DSMath.wdiv(totalCollateralValue, denom);
        return (liquidationRatio, totalCollateralValue);
    }

    function collateralValue(uint _agreementId, bytes32 _collateral) internal returns (uint, uint) {
        uint quantity = managingDirector.agreementCollateral(_agreementId, _collateral);

        uint price = ticker.getPrice(_collateral); 
        uint value = DSMath.mul(quantity, price);

        return (price, value);
    }

}
//solhint-disable indent
pragma solidity ^0.5.0;

import "./Math.sol";


contract IManagingDirector {
    function collaterals(bytes32) public view returns (uint, uint, uint);
    function agreements(uint) public view returns (bytes32, bytes32[] memory, uint, uint, uint);
    function agreementCollateralAmount(uint, bytes32) public view returns (uint);
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
        (, bytes32[] memory cts, , , ) = managingDirector.agreements(_agreementId);

        uint totalCollateralValue; 
        uint denom;
        for (uint i = 0; i < cts.length; i++) {

            (, uint ratio, ) = managingDirector.collaterals(cts[i]);
            (uint price, uint value) = collateralValue(_agreementId, cts[i]);

            denom = DSMath.add(denom, DSMath.rdiv(price, ratio));
            totalCollateralValue = DSMath.add(totalCollateralValue, value); 
        }
        uint liquidationRatio = DSMath.wdiv(totalCollateralValue, denom);
        
        return (liquidationRatio, totalCollateralValue);

    }

    function collateralValue(uint _agreementId, bytes32 _collateral) internal returns (uint, uint) {
        uint quantity = managingDirector.agreementCollateralAmount(_agreementId, _collateral);

        uint price = ticker.getPrice(_collateral); 
        uint value = DSMath.mul(quantity, price);

        return (price, value);
    }

}
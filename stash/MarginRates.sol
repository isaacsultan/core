pragma solidity 0.4.24;


interface IManagingDirector {
    function collateralTypes(bytes32) public returns (uint256, uint256, uint256);
    function burnDelta(bytes32, bytes32, int);
}


contract MarginRates {

    struct CollateralType {
        uint256 interestRate;
        uint48 previousCollection;
    }

    mapping (bytes32 => CollateralType) public collateralTypes;
    IManagingDirector public managingDirector;
    
    function era() public view returns(uint48) {
        return uint48(now);
    }

    constructor(address _managingDirector) public {
        managingDirector = IManagingDirector(_managingDirector);
    }

    function init(bytes32 collateralType) public {
        CollateralType storage ct = collateralTypes[collateralType];
        ct.previousCollection = era();
    }

    function collectMarginRates(bytes32 collateralType) public {
        CollateralType storage ct = collateralTypes[collateralType];
        require(era() >= ct.previousCollection);

        //deduct from managing director

        ct.previousCollection = era();
    }
}
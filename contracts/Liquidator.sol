pragma solidity ^0.5.0;


contract IManagingDirector {

}

// interface IManagingDirector {
//     function liquidateCdd(bytes32 i, bytes32 u, bytes32 v, bytes32 w, int dink, int dart) public;
// }


// interface TradingFloor {
//     function sellCollateral();
// }


contract Liquidator {

    // struct Cdd {
    //     address liquidator;
    //     uint256 liqudationQuantity;
    // }

    // struct CollateralSale {
    //     bytes32 collateralType;
    //     bytes32 cdd;
    //     uint256 collateralQuantity;
    //     uint256 debtOutstanding;
    // }

    // mapping(bytes32 => Cdd) public cdds;
    // mapping(uint256 => CollateralSale) public collateralSales;
    // uint256 public collateralSaleCounter;
    mapping(uint256 => uint256) public liquidationTimes;


    IManagingDirector public managingDirector;

    event ResetLiquidaton(uint agreementId, uint time);

    constructor(address _managingDirector)
    public {
        managingDirector = IManagingDirector(_managingDirector);
    }

    function resetTime(uint agreementId) public {
        liquidationTimes[agreementId] = now;
        emit ResetLiquidaton(agreementId, now);
    }


    // function initiateCddLiquidation(bytes32 collateralType, bytes32 cdd) public returns (uint id) {
        
    //     (uint lr, uint tcb, uint tpd) = managingDirector.collateralTypes(collateralType);
    //     (uint cb, uint pd, uint ir) = managingDirector.cdds(collateralType, cdd);
    //     uint256 debt = 0; //todo

    //     address vow = address(this); //todo

    //     managingDirector.liquidateCdd(collateralType, bytes32(address(this)), bytes32(address(vow)), cb, pd);

    //     collateralSales[collateralSaleCounter] = CollateralSale(collateralType, cdd, cb, debt);
    //     return collateralSaleCounter++;
    // }

    // function sellCddCollateral(uint256 id, uint256 eth) public {

        
    // }
}

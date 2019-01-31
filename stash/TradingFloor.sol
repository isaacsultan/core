pragma solidity 0.4.24;


interface IManagingDirector {
    function modifyClientCollateralBalance(bytes32, bytes32, uint256) public;
}

contract TradingFloor {

    IManagingDirector managingDirector;

    constructor(address _managingDirector) {
        managingDirector = IManagingDirector(_managingDirector);
    }

    function sellCollateral(bytes32 client, uint256 amount) public {
        managingDirector.modifyClientCollateralBalance(client, bytes32(address(this)), amount);
        amount;

    }

}
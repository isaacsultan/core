pragma solidity ^0.5.0;


contract MockBasicToken {

    event AuthorizedOperator(address, address);

    function authorizeOperator(address _operator) public {
        emit AuthorizedOperator(_operator, msg.sender);
    }
}
pragma solidity ^0.5.0;

import {BasicTokenFactory} from "../BasicToken.sol";

contract MockBasicTokenFactory is BasicTokenFactory {
    constructor(address _adminRole) BasicTokenFactory(_adminRole) public {
    }
}
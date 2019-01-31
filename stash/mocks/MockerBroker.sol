pragma solidity ^0.5.0;

import {Broker} from "../Broker.sol";
import "../Math.sol";


contract MockBroker is Broker {
    constructor() public {
        productToUnderlying["CTB"] = "BTC";
        productToUnderlying["HTE"] = "ETH";

        // approveCollateral("ETH", 0, ray(15, 1));
        // approveCollateral("DAI", 0, ray(101, 2));
        // approveCollateral("WBTC", 0, ray(12, 1));

    }

    function ray(uint integer, uint offset) internal pure returns (uint) {
        return integer * 10 ** (27 - offset);
    }

    function wad (uint integer, uint offset) internal pure returns (uint) {
        return integer * 10 ** (18 - offset);
    }

    function iwad (int integer, uint offset) internal pure returns (int) {
        return DSMath.mul(10 ** (18 - offset), integer);
    }
}
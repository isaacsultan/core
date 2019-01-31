
pragma solidity ^0.5.0;


// placeholder: chainlink implemented in stash/Ticker.sol
contract MockTicker {

    constructor(address _managingDirector) public {}
    
    function getPrice(bytes32 _type) public returns (uint) {
        if (_type == "BTC") {
            return 3500;
        }
        if (_type == "CTB") {
            return 20;
        }
        if (_type == "ETH") {
            return 100;
        }
        if (_type == "HTE") {
            return 10;
        }
        if (_type == "WBTC") {
            return 3500;
        }
        if (_type == "DAI") {
            return 1;
        }
        return 0;
    } 
}
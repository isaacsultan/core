/*

    Copyright 2019 Partial f

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

*/

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
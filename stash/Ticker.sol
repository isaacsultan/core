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

//solhint-disable indent
pragma solidity 0.4.24;

import "chainlink/solidity/contracts/Chainlinked.sol";


contract Ticker is Chainlinked {

    uint256 constant private ORACLE_PAYMENT = 1 * LINK;
    bytes32 constant SPEC_ID = bytes32("6dc1e009bd8842699b4e1495aa8c3b91"); //coinmarketcap
    uint256 public latestPrice;
    IManagingDirector managingDirector; 

    constructor(adddress _managingDirector) {
        managingDirector = IManagingDirector(_managingDirector);

        setLinkToken(0x20fE562d797A42Dcb3399062AE9546cd06f63280); //Ropsten faucet
        setOracle(0xCda5773a68dC7E18fdC600E68c3FdC414f29e7eC); //Ropsten faucet
    }

    event RequestFulfilled(bytes32 indexed requestId, uint256 indexed price);

    function getPrice(bytes32 _type) public returns (uint) {
        fetchPrice(_type);
        return latestPrice;
    } 

    function fetchPrice(string _coin) 
    private
    returns (bytes32 requestId) 
    {
        ChainlinkLib.Run memory run = newRun(SPEC_ID, this, "fulfill(bytes32,uint256)");
        run.add("sym", _coin);
        string[] memory path = new string[](5);
        path[0] = "data";
        path[1] = _coin;
        path[2] = "quote";
        path[3] = "ETH"; //check
        path[4] = "price";
        run.addStringArray("copyPath", path);
        run.addInt("times", 100);
        requestId = chainlinkRequest(run, ORACLE_PAYMENT);
    }

    function fulfill(bytes32 _requestId, uint256 _price) private
    checkChainlinkFulfillment(_requestId)
    {
        emit RequestFulfilled(_requestId, _price);
        latestPrice = _price;
    }
}

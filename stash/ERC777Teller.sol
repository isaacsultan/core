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

contract IERC777 {
    function send(address to, uint256 amount) public;
}

contract ERC777Teller {
    IManagingDirector public managingDirector;
    bytes32 public collateralType;
    IERC777 public collateralToken;    uint public constant ONE = 10**27;
 
    constructor(address _managingDirector, bytes32 _collateralType, address _collateralToken) public {
        managingDirector = IManagingDirector(_managingDirector);
        collateralType = _collateralType;
        collateralToken = IERC777(_collateralToken);
    }    function deposit(uint _amount) public {
        // solhint-disable-next-line check-send-result
        collateralToken.send(address(this), _amount);
        managingDirector.modifyClientCollateralBalance(collateralType, msg.sender, DSMath.mul(ONE, int(_amount)));
    }    function withdraw(int _amount) public {
        // solhint-disable-next-line check-send-result
        require(clientCollateral(msg.sender, collateralType) >= _amount);
        collateralToken.send(msg.sender, _amount);
        managingDirector.modifyClientCollateralBalance(collateralType, msg.sender, -DSMath.mul(ONE, int(_amount)));
    }
}

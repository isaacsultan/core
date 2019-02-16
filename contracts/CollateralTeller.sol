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

import "openzeppelin-solidity/contracts/access/Roles.sol";
import "./Math.sol";


contract IErc20 {
    function transferFrom(address, address, uint) public returns (bool);
}


contract IManagingDirector {
    function increaseClientCollateralBalance(address, bytes32, uint) public;
    function decreaseClientCollateralBalance(address, bytes32, uint) public;
    function clientCollateral(address, bytes32) public view returns (uint);
}

contract Erc20TellerFactory {

    using Roles for Roles.Role;
    Roles.Role private adminRole;
    
    Erc20Teller[] public erc20Tellers;
    mapping(address => bool) public erc20TellerRegistry;

    constructor(address _adminRole) public {
        adminRole.add(_adminRole);
    }

    event NewErc20Teller(bytes32 collateralType, address collateralToken);

    function makeErc20Teller(bytes32 _collateralType, address _collateralToken, address _managingDirector, address _adminRole) public {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        Erc20Teller newContract = new Erc20Teller(_managingDirector, _collateralType, _collateralToken, _adminRole);
        erc20Tellers.push(newContract);
        erc20TellerRegistry[address(newContract)] = true;
        emit NewErc20Teller(_collateralType, _collateralToken);
    }

    function verify(address contractAddress) public view returns (bool) {
        return erc20TellerRegistry[contractAddress];
    }
}

contract Erc20Teller {

    using Roles for Roles.Role;
    Roles.Role private adminRole;
    
    IManagingDirector public managingDirector;
    bytes32 public collateralType;
    IErc20 public collateralToken;

    uint public liquidityRatio; //ray
    uint public liquidationFee; //wad
    uint public constant ONE = 10**27;

    event Erc20TellerParams(bytes32 tellerType, address tokenAddress, uint liquidityRatio, uint liquidationFee);
    
    constructor(address _managingDirector, bytes32 _collateralType, address _collateralToken, address _adminRole) public { //TODO: Restrict permision to factory
        managingDirector = IManagingDirector(_managingDirector);
        collateralType = _collateralType;
        collateralToken = IErc20(_collateralToken);
        adminRole.add(_adminRole);
    }

    function setParameters(uint _liquidityRatio, uint _liquidationFee) public {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        liquidityRatio = _liquidityRatio;
        liquidationFee = _liquidationFee;
        emit Erc20TellerParams(collateralType, address(collateralToken), liquidityRatio, liquidationFee);
    }
    
    function deposit(uint _amount) public {
        require(collateralToken.transferFrom(msg.sender, address(this), _amount));
        managingDirector.increaseClientCollateralBalance(msg.sender, collateralType, _amount);
    }

    function withdraw(uint _amount) public {
        require(managingDirector.clientCollateral(msg.sender, collateralType) >= _amount);
        require(collateralToken.transferFrom(address(this), msg.sender, _amount));
        managingDirector.decreaseClientCollateralBalance(msg.sender, collateralType, _amount);
    }
}


contract EthTeller {

    using Roles for Roles.Role;
    Roles.Role private adminRole;

    IManagingDirector public managingDirector;
    bytes32 public collateralType = "ETH";

    uint public liquidityRatio; //ray
    uint public liquidationFee; //wad
    uint public constant ONE = 10**27;

    event EthTellerParams(bytes32 tellerType, uint liquidityRatio, uint liquidationFee);

    constructor(address _managingDirector, address _adminRole) public {
        managingDirector = IManagingDirector(_managingDirector);
        adminRole.add(_adminRole);
    }

    function setParameters(uint _liquidityRatio, uint _liquidationFee) public {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        liquidityRatio = _liquidityRatio;
        liquidationFee = _liquidationFee;
        emit EthTellerParams(collateralType, liquidityRatio, liquidationFee);
    }

    function deposit() public payable {
        managingDirector.increaseClientCollateralBalance(msg.sender, collateralType, msg.value);
    }

    function withdraw(uint _amount) public {
        require(managingDirector.clientCollateral(msg.sender, collateralType) >= _amount);
        msg.sender.transfer(_amount);
        managingDirector.decreaseClientCollateralBalance(msg.sender, collateralType, _amount);
    }
}
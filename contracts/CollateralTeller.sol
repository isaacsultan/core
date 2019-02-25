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
    function approve(address, uint256) public returns (bool);
    function transfer(address to, uint256 value) public returns (bool);
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
    mapping(bytes32 => Erc20Teller) public tokenToTeller;

    constructor(address _adminRole) public {
        adminRole.add(_adminRole);
    }

    event NewErc20Teller(bytes32 collateralType, address collateralToken);

    function makeErc20Teller(bytes32 _collateralType, address _collateralToken, address _managingDirector, address _adminRole) public {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        Erc20Teller newContract = new Erc20Teller(_managingDirector, _collateralType, _collateralToken, _adminRole);
        erc20Tellers.push(newContract);
        erc20TellerRegistry[address(newContract)] = true;
        tokenToTeller[_collateralType] = newContract;
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
    
    function deposit(address _sender, uint _amount) public {
        require(collateralToken.transferFrom(_sender, address(this), _amount));
        managingDirector.increaseClientCollateralBalance(_sender, collateralType, _amount);
    }

    function withdraw(address _sender, uint _amount) public {
        require(managingDirector.clientCollateral(_sender, collateralType) >= _amount);
        require(collateralToken.transfer(_sender, _amount));
        managingDirector.decreaseClientCollateralBalance(_sender, collateralType, _amount);
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

    function deposit(address _sender) public payable {
        managingDirector.increaseClientCollateralBalance(_sender, collateralType, msg.value);
    }

    function withdraw(address payable _sender, uint _amount) public {
        require(managingDirector.clientCollateral(_sender, collateralType) >= _amount);
        _sender.transfer(_amount);
        managingDirector.decreaseClientCollateralBalance(_sender, collateralType, _amount);
    }
}
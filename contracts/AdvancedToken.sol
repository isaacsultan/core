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

//TODO: IMPLEMENT ERC777
//import "../installed_contracts/ERC777/ERC777.sol"; 
import "openzeppelin-solidity/contracts/access/Roles.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";


contract AdvancedTokenFactory {
    using Roles for Roles.Role;
    Roles.Role private adminRole;

    ERC777[] public advancedTokens;
    mapping(address => bool) public advancedTokenRegistry;

    constructor(address _adminRole) public {
        adminRole.add(_adminRole);
    }

    event NewAdvancedToken(string name, string symbol, uint256 granularity, uint256 initialSupply);

    function makeAdvancedToken
    (
        string memory _name,
        string memory _symbol,
        uint256 _granularity,
        address[] memory _defaultOperators,
        address _burnOperator,
        uint256 _initialSupply
    )
        public
    {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        ERC777 newContract = new ERC777(_name, _symbol, _granularity, _defaultOperators, _burnOperator, _initialSupply, "", "");

        advancedTokens.push(newContract);
        advancedTokenRegistry[address(newContract)] = true;
        emit NewAdvancedToken(_name, _symbol, _granularity, _initialSupply);
    }

    function verify(address contractAddress) public view returns (bool) {
        return advancedTokenRegistry[contractAddress];
    }
}

//pseudo
contract ERC777 is ERC20Burnable, ERC20Mintable {
    string public name;
    string public symbol;

    event AuthorizedOperator(address operator, address tokenHolder);
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _granularity,
        address[] memory _defaultOperators,
        address _burnOperator,
        uint256 _initialSupply,
        bytes memory dataOne,
        bytes memory dataTwo
        ) public {
            name = _name;
            symbol = _symbol;
            _mint(msg.sender, _initialSupply); //address: AdvancedTokenFactory 
        }

    function mint(address _to, uint _amount, bytes memory _data) public {
        _mint(_to, _amount);
    }

    function operatorBurn(address _from, uint _amount, bytes memory _data, bytes memory _operatorData) public {
        burnFrom(_from, _amount);
    }

    function authorizeOperator(address _tokenHolder) public { //TODO
        emit AuthorizedOperator(msg.sender, _tokenHolder);
    }

}
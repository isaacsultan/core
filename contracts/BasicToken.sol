pragma solidity ^0.5.0;

//TODO: IMPLEMENT ERC777
//import "../installed_contracts/ERC777/ERC777.sol"; 
import "openzeppelin-solidity/contracts/access/Roles.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";


contract BasicTokenFactory {
    using Roles for Roles.Role;
    Roles.Role private adminRole;

    ERC777[] public basicTokens;
    mapping(address => bool) public basicTokenRegistry;

    constructor(address _adminRole) public {
        adminRole.add(_adminRole);
    }

    event NewBasicToken(string name, string symbol, uint256 granularity, uint256 initialSupply);

    function makeBasicToken
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

        basicTokens.push(newContract);
        basicTokenRegistry[address(newContract)] = true;
        emit NewBasicToken(_name, _symbol, _granularity, _initialSupply);
    }

    function verify(address contractAddress) public view returns (bool) {
        return basicTokenRegistry[contractAddress];
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
            _mint(msg.sender, _initialSupply);
        }

    function mint(address _to, uint _amount, bytes memory _data) public {
        _mint(_to, _amount);
    }

    function operatorBurn(address _from, uint _amount, bytes memory _data) public {
        burnFrom(_from, _amount);
    }

    function authorizeOperator(address _tokenHolder) public { //TODO
        emit AuthorizedOperator(msg.sender, _tokenHolder);
    }

}
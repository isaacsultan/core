pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/access/Roles.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract BasicTokenFactory {
    using Roles for Roles.Role;
    Roles.Role private adminRole;

    ERC20[] public basicTokens;
    mapping(address => bool) public basicTokenRegistry;

    constructor(address _adminRole) public {
        adminRole.add(_adminRole);
    }

    event NewBasicToken(string symbol, address tokenAddress);

    function makeBasicToken
    (
        string memory _symbol,
        address _tokenAddress
    )
        public
    {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        ERC20 newContract = ERC20(_tokenAddress);

        basicTokens.push(newContract);
        basicTokenRegistry[address(newContract)] = true;
        emit NewBasicToken(_symbol, _tokenAddress);
    }

    function verify(address contractAddress) public view returns (bool) {
        return basicTokenRegistry[contractAddress];
    }
}
pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/access/Roles.sol";
import "./Math.sol";


contract IErc20 {
    function transferFrom(address, address, uint) public returns (bool);
}


contract IManagingDirector {
    function modifyClientCollateralBalance(bytes32, address, int) public;
    function clientCollateral(address, bytes32) public view returns (uint);
}

contract Erc20TellerFactory {

    using Roles for Roles.Role;
    Roles.Role private adminRole;
    
    Erc20Teller[] public erc20Tellers;
    mapping(address => bool) public erc20TellerRegistry;
    mapping(bytes32 => address) public contracts;

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
    uint public liquidityFee; //wad
    uint public constant ONE = 10**27;

    event NewErc20TellerParams(bytes32 tellerType, uint liquidityRatio, uint liquidityFee);
    
    constructor(address _managingDirector, bytes32 _collateralType, address _collateralToken, address _adminRole) public {
        managingDirector = IManagingDirector(_managingDirector);
        collateralType = _collateralType;
        collateralToken = IErc20(_collateralToken);
        adminRole.add(_adminRole);
    }

    function setParameters(uint _liquidityRatio, uint _liquidationFee) public {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        liquidityRatio = _liquidityRatio;
        liquidityFee = _liquidationFee;
    }
    
    function deposit(uint _amount) public {
        require(collateralToken.transferFrom(msg.sender, address(this), _amount)); //TODO: set a minimum amount
        managingDirector.modifyClientCollateralBalance(collateralType, msg.sender, DSMath.mul(ONE, int(_amount)));
    }

    function withdraw(uint _amount) public {
        require(managingDirector.clientCollateral(msg.sender, collateralType) >= _amount);
        require(collateralToken.transferFrom(address(this), msg.sender, _amount));
        managingDirector.modifyClientCollateralBalance(collateralType, msg.sender, -DSMath.mul(ONE, int(_amount)));
    }
}


contract EthTeller {

    using Roles for Roles.Role;
    Roles.Role private adminRole;

    IManagingDirector public managingDirector;
    bytes32 public collateralType = "ETH";

    uint public liquidityRatio; //ray
    uint public liquidityFee; //wad
    uint public constant ONE = 10**27;

    constructor(address _managingDirector, address _adminRole) public {
        managingDirector = IManagingDirector(_managingDirector);
        adminRole.add(_adminRole);
    }

    function setParameters(uint _liquidityRatio, uint _liquidationFee) public {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        liquidityRatio = _liquidityRatio;
        liquidityFee = _liquidationFee;
    }

    function deposit() public payable { //TODO: set a minimum amount
        managingDirector.modifyClientCollateralBalance(collateralType, msg.sender, DSMath.mul(ONE, int(msg.value)));
    }

    function withdraw(uint _amount) public {
        require(managingDirector.clientCollateral(msg.sender, collateralType) >= _amount);
        msg.sender.transfer(_amount);
        managingDirector.modifyClientCollateralBalance(collateralType, msg.sender, -DSMath.mul(ONE, int(_amount)));
    }
}
//solhint-disable indent
pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/access/Roles.sol";
import "./Math.sol";
import "./Economics.sol";


contract IManagingDirector {
    function originateAgreement(bytes32, address) public returns (uint);
    function modifyAgreementCollateral(uint256, bytes32, int) public;
    function collaterals(bytes32) public view returns (uint256, uint256, uint256);
    function productToUnderlying(bytes32) public view returns (bytes32);
    function agreements(uint256) public view returns (bytes32, bytes32[] memory, uint, uint, uint);
}


contract IBasicTokenFactory {
    function contracts(bytes32) public view returns (address);
}


contract IBasicToken {
    function authorizeOperator(address) public;
}


contract ICompliance {
    function collateralizationParams(uint) public returns (uint, uint);
}


contract IErc20TellerFactory {
    function contracts(bytes32) public view returns (address);
}


contract IErc20Teller {
    function deposit(uint _amount) public;
    function withdraw(uint _amount) public;}


contract IEthTeller {
    function deposit() public payable;
    function withdraw(uint _amount) public;
}


contract Broker {

    using Roles for Roles.Role;
    Roles.Role private adminRole;

    IManagingDirector public managingDirector;
    IBasicTokenFactory public basicTokenFactory;
    ICompliance public compliance;
    uint256 public offerFee;
    IEthTeller public ethTeller;
    IErc20TellerFactory public erc20TellerFactory;

    mapping (bytes32 => bytes32) public productToUnderlying;

    event ProductDebt(uint, int);

    constructor(address _managingDirector, address _btFactory, address _compliance, address _ethTeller, address _erc20TellerFactory, address _adminRole) public {
        managingDirector = IManagingDirector(_managingDirector);
        basicTokenFactory = IBasicTokenFactory(_btFactory);
        compliance = ICompliance(_compliance);
        ethTeller = IEthTeller(_ethTeller);
        erc20TellerFactory = IErc20TellerFactory(_erc20TellerFactory);
        adminRole.add(_adminRole);
    }

    function approveProduct(bytes32 _productType, bytes32 _underlyingType) public {
        require(adminRole.has(msg.sender), "DOES_NOT_HAVE_ADMIN_ROLE");
        productToUnderlying[_productType] = _underlyingType;
    }

    function agree(bytes32 _product) public returns (uint) {
        uint agreementId = managingDirector.originateAgreement(_product, msg.sender);
        IBasicToken(basicTokenFactory.contracts("delta")).authorizeOperator(address(this)); 
        return agreementId;
    }

    function offerCollateral(uint _agreementId, bytes32 _collateralType, uint _collateralChange) public payable {
        (, , uint productDebt, , ) = managingDirector.agreements(_agreementId);
        (uint liquidationRatio, uint totalCollateralValue) = compliance.collateralizationParams(_agreementId);
        
        if (Economics.collateralized(liquidationRatio, totalCollateralValue, productDebt)) {
            if (_collateralType == "ETH") { //TODO: Fix equality
                ethTeller.deposit.value(_collateralChange);
            } else {
                IErc20Teller(erc20TellerFactory.contracts(_collateralType)).deposit(_collateralChange);
            }
        } else {
            managingDirector.modifyAgreementCollateral(_agreementId, _collateralType, int(_collateralChange));
        }
    }

    function withdrawCollateral(uint _agreementId, bytes32 _collateralType, uint _collateralChange) public { //TODO: check collateralisation after change
        (, , uint productDebt, , ) = managingDirector.agreements(_agreementId);
        (uint liquidationRatio, uint totalCollateralValue) = compliance.collateralizationParams(_agreementId);
        require(Economics.collateralized(liquidationRatio, totalCollateralValue, productDebt), "Uncollateralized!");

        if (_collateralType == "ETH") { //TODO: Fix equality
            ethTeller.withdraw(_collateralChange);
        } else {
            IErc20Teller(erc20TellerFactory.contracts(_collateralType)).withdraw(_collateralChange);
        }
    }
}
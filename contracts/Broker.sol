//solhint-disable indent
pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/access/Roles.sol";
import "./Math.sol";
import "./Economics.sol";


contract IManagingDirector {
    function originateAgreement(address, bytes32) public returns (uint);
    function increaseAgreementCollateral(uint256, bytes32, uint) public;
    function collaterals(bytes32) public view returns (uint256, uint256, uint256);
    function productToUnderlying(bytes32) public view returns (bytes32);
    function agreements(uint256) public view returns (bytes32, uint, uint, uint);
    function modifyAgreementOwner(uint, address) public;
    function agreementOwner(uint) public view returns (address);
}

contract IBasicTokenFactory {
    function basicTokens(uint) public view returns (IERC777);
}


contract IERC777 {
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
    event NewProductType(bytes32 productType, bytes32 underlyingType);
    event NewAgreement(address client, uint id, bytes32 product);
    event AgreementTransfer(uint id, address from, address to);
    event CollateralOffer(address client, uint id, bytes32 collateral, uint amount);
    event CollateralWithdraw(address client, uint id, bytes32 collateral, uint amount);

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
        emit NewProductType(_productType, _underlyingType);
    }

    function agree(bytes32 _product) public returns (uint) {
        uint agreementId = managingDirector.originateAgreement(msg.sender, _product);
        basicTokenFactory.basicTokens(0).authorizeOperator(msg.sender);  //TODO
        emit NewAgreement(msg.sender, agreementId, _product);
        return agreementId;
    }

    function transferOwnership(uint _agreementId, address _to) public {
        require(msg.sender == managingDirector.agreementOwner(_agreementId), "User does not own agreement");
        managingDirector.modifyAgreementOwner(_agreementId, _to);
        emit AgreementTransfer(_agreementId, msg.sender, _to);
    }

    function offerCollateral(uint _agreementId, bytes32 _collateralType, uint _collateralChange) public payable { //check logic
        (, uint productDebt, , ) = managingDirector.agreements(_agreementId);
        (uint liquidationRatio, uint totalCollateralValue) = compliance.collateralizationParams(_agreementId);
        
        if (Economics.collateralized(liquidationRatio, totalCollateralValue, productDebt)) {
            if (_collateralType == "ETH") { //TODO: Fix equality
                ethTeller.deposit.value(_collateralChange);
            } else {
                IErc20Teller(erc20TellerFactory.contracts(_collateralType)).deposit(_collateralChange);
            }
        } else {
            managingDirector.increaseAgreementCollateral(_agreementId, _collateralType, _collateralChange);
        }
        emit CollateralOffer(msg.sender, _agreementId, _collateralType, _collateralChange);
    }

    function withdrawCollateral(uint _agreementId, bytes32 _collateralType, uint _collateralChange) public { //TODO: check collateralisation after change
        (, uint productDebt, , ) = managingDirector.agreements(_agreementId);
        (uint liquidationRatio, uint totalCollateralValue) = compliance.collateralizationParams(_agreementId);
        require(Economics.collateralized(liquidationRatio, totalCollateralValue, productDebt), "Uncollateralized!");

        if (_collateralType == "ETH") { //TODO: Fix equality
            ethTeller.withdraw(_collateralChange);
        } else {
            IErc20Teller(erc20TellerFactory.contracts(_collateralType)).withdraw(_collateralChange);
        }
        emit CollateralWithdraw(msg.sender, _agreementId, _collateralType, _collateralChange);
    }
}
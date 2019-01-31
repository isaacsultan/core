const { BigNumber, should } = require('openzeppelin-test-helpers/src/setup.js');

const shouldFail = require('openzeppelin-test-helpers/src/shouldFail');
const expectEvent = require('openzeppelin-test-helpers/src/expectEvent');

const toBytes = web3.utils.utf8ToHex;

const BasicTokenFactory = artifacts.require('MockBasicTokenFactory');
const ManagingDirector = artifacts.require('MockManagingDirector');
const ProductTeller = artifacts.require('ProductTeller');

const Erc20Teller = require('Erc20Teller');
const ManagingDirector = require('MockManagingDirector');
const BasicToken = require('MockBasicToken');

contract('Erc20Teller', function ([_, adminRole]) {
    beforeEach(async function () {
        this.managingDirector = await ManagingDirector.new();
        this.collateralToken = await BasicToken.new(); //TODO: should be instantiated by factory?
        this.erc20Teller = await Erc20Teller.new(this.managingDirector, toBytes('DAI'), this.collateralToken, adminRole);
    });
    describe('setParameters()', function () {
        it('should allow admin to set liquidity parameters', async function() {
            var { logs } = await this.erc20Teller.setParameters(1, 1, {from: adminRole}); //TODO: set in appropriate range
            expectEvent.inLogs(logs, 'NewErc20TellerParams', {tellerType: toBytes('DAI'), liquidityRatio: 1, liquidationFee: 1});
        });
    });   
    describe('deposit()', function () {

    });
    describe('withdraw()', function () {

    });
});

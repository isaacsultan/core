
const { BigNumber, should } = require('openzeppelin-test-helpers/src/setup.js');

const shouldFail = require('openzeppelin-test-helpers/src/shouldFail');
const expectEvent = require('openzeppelin-test-helpers/src/expectEvent');

const toBytes = web3.utils.utf8ToHex;

const BasicTokenFactory = artifacts.require('MockBasicTokenFactory');
const Broker = artifacts.require('MockBroker');
const ManagingDirector = artifacts.require('MockManagingDirector');
const Compliance = artifacts.require('MockCompliance');
const Ticker = artifacts.require('MockTicker');
const ProductTeller = artifacts.require('ProductTeller');

contract('ProductTeller', function ([_, adminRole]) {
    const productFee = new BigNumber(0.5); //to BN
    const productType = 'CTB';
    beforeEach(async function () {
      this.managingDirector = await ManagingDirector.new();
      this.liquidator = await Liquidator.new(this.managingDirector.address);
      this.delta = await BasicToken.new(); //Todo: should be instantiated by factory?
      this.product = await BasicToken.new(); //Todo should be instantiated by factory?
      this.ticker = await Ticker.new();
      this.compliance = await Compliance.new(this.managingDirector.address, this.ticker.address);
      this.broker = await Broker.new(this.managingDirector.address,this.delta.address, this.ticker.address, this.liquidator.address, productFee);
      this.productTeller = await ProductTeller.new
      (
        productType,
        this.managingDirector,
        this.broker,
        this.product,
        this.delta,
        this.ticker,
        this.liquidator,
        this.compliance,
        adminRole
      )
    });
    describe('setProductFee', function () {
      it('should allow an admin to set a product fee', async function () {
        this.productTeller.setProductFee(1, {from: adminRole}); //TODO: set correct scale of fee
      });
    });
    describe('withdraw()', function () {
      beforeEach(async function() {
        await this.broker.approveProduct(toBytes('CTB'), toBytes('BTC'));
        await this.broker.agree(toBytes('CTB'));
        this.productTeller.setProductFee(1, {from: adminRole}); //TODO: set correct scale of fee
      });
      it('should only mints product tokens when there is no debt', async function () {
        await this.productTeller.withdraw(0, 1);

        await shouldFail.reverting(this.productTeller.withdraw(0, 1));
      });
      it('should take a product fee', async function () {
        var amount = 2;
        var fee = amount * 500 * productFee;
        await this.broker.offerCollateral(0, toBytes('ETH'), 10);

        var { logs } = await this.productTeller.withdraw(0, amount);
        expectEvent.inLogs(logs, 'Burned', {from: msg.sender, amount: fee});
      });
      it('should calculate the liquidation ratio correctly', async function () { //TODO: fix values
          var ethAmount = 1.53457212312387623;
          await this.broker.offerCollateral(0, toBytes('ETH'), ethAmount);
          var daiAmount = 100.26348934940293934;
          await this.broker.offerCollateral(0, toBytes('DAI'), daiAmount);
          var wbtcAmount = 0.56894034048203490;
          await this.broker.offerCollateral(0, toBytes('WBTC'), wbtcAmount);

          var tcv = ethAmount * 100 + daiAmount * 1 + wbtcAmount * 3500;
          var denom = (ethAmount * 100)/1.5 + (daiAmount*1)/1.01 + (wbtcAmount * 3500)/1.2;
          var expectedLR = tcv/denom;

          var { logs } = await this.productTeller.withdraw(0, 1.5);
          expectEvent.inLogs(logs, 'LiquidationRatio', {amount: expectedLR});

      });
      it('should not allow withdrawal if the agreement is uncollaterized', async function () {
        await shouldFail.reverting(this.productTeller.withdraw(0, 1));
      });
  });

  describe('pay()', function () {
    beforeEach(async function () {
      await this.broker.offerCollateral(0, toBytes('ETH'), 10);
      await this.productTeller.withdraw(0, 1);
    });
    it('should burn the product tokens', async function() {
      var tokenAmount = 1;
      var { logs } = await this.productTeller.pay(0, tokenAmount);
      expectEvent.inLogs(logs, 'Burned', {from: msg.sender, amount: tokenAmount});
    });
    context('when the debt is partially paid', function() {
      beforeEach(async function() {
        var { logs } = await this.productTeller.pay(0, 0.75);
      });
      it('should take a new fee', async function () {
        expectEvent.inLogs(logs, 'Burned', {from: msg.sender, amount: tokenAmount}); //check
      });
      it('should reset liquidation time', async function () {
        var newTime = 0; //TODO
        expectEvent.inLogs(logs, 'ResetLiquidation', {agreementId: 0, time: newTime})
      });
      it('should modify the agreement', async function () {
        var agreement = await this.managingDirector.agreements(0);
        agreement.productDebt.should.equal(0.25);
      }); 
    });
    context('when the debt is fully paid', function () {
      it('should liquidate the agreement', async function () {
        await this.productTeller.pay(0, 1);
        //TODO
      });
    });
  });
});
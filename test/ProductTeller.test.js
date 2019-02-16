const {
  BN,
  expectEvent,
  shouldFail,
  constants,
  balance,
  send,
  ether
} = require("openzeppelin-test-helpers");
const toBytes = web3.utils.utf8ToHex;
const padRight = web3.utils.padRight;
const { wad, ray } = require("./fixedPoint");
const setup = require("./productTellerSetup");

contract("ProductTellerFactory", function([_, adminRole, brokerRole]) {
  const productType = toBytes("CTB");
  const granularity = new BN(18);
  const burnOperator = adminRole;
  const approvedOperators = [adminRole];
  const initialSupply = new BN(100000000);
  let productTellerFactory,
    managingDirector,
    broker,
    productToken,
    deltaToken,
    ticker,
    liquidator,
    compliance;
  beforeEach(async function() {
    [
      productTellerFactory,
      managingDirector,
      broker,
      productToken,
      deltaToken,
      ticker,
      liquidator,
      compliance
    ] = await setup(adminRole, brokerRole);
  });
  describe("#makeErc20Teller", function() {
    it("reverts if not called by an admin", async function() {
      shouldFail.reverting(
        productTellerFactory.makeProductTeller(
          productType,
          managingDirector.address,
          broker.address,
          productToken,
          deltaToken,
          ticker.address,
          liquidator.address,
          compliance.address,
          adminRole
        )
      );
    });
    it("adds a new token", async function() {
      const { logs } = await productTellerFactory.makeProductTeller(
        productType,
        managingDirector.address,
        broker.address,
        productToken,
        deltaToken,
        ticker.address,
        liquidator.address,
        compliance.address,
        adminRole,
        { from: adminRole }
      );
      expectEvent.inLogs(logs, "NewProductTeller", {
        productType: padRight(productType, 64),
        productToken: productToken
      });
    });
  });
  describe("#verify", function() {
    it("should check if a token contract exists", async function() {
      await productTellerFactory.makeProductTeller(
        productType,
        managingDirector.address,
        broker.address,
        productToken,
        deltaToken,
        ticker.address,
        liquidator.address,
        compliance.address,
        adminRole,
        { from: adminRole }
      );
      const tokenAddress = await productTellerFactory.productTellers(0);
      (await productTellerFactory.verify(tokenAddress)).should.be.true;
    });
  });
});

contract("ProductTeller", function([_, adminRole, brokerRole]) {
  const productFee = new BN(0.5);
  const productType = toBytes("CTB");
  let managingDirector, broker;
  beforeEach(async function() {
    let [
      productTellerFactory,
      managingDirector,
      broker,
      productToken,
      deltaToken,
      ticker,
      liquidator,
      compliance
    ] = await setup(adminRole, brokerRole);

    await productTellerFactory.makeProductTeller(
      productType,
      managingDirector.address,
      broker.address,
      productToken,
      deltaToken,
      ticker.address,
      liquidator.address,
      compliance.address,
      adminRole,
      { from: adminRole }
    );
    this.productTeller = await productTellerFactory.productTellers(0);
    console.log(this.productTeller.address);
  });
  describe("setProductFee", function() {
    it("should allow an admin to set a product fee", async function() {
      this.productTeller.setProductFee(productFee, { from: adminRole }); //TODO: set correct scale of fee
    });
  });
  describe("withdraw()", function() {
    beforeEach(async function() {
      await broker.approveProduct(toBytes("CTB"), toBytes("BTC"));
      await broker.agree(toBytes("CTB"));
      this.productTeller.setProductFee(1, { from: adminRole }); //TODO: set correct scale of fee
    });
    it("should only mints product tokens when there is no debt", async function() {
      await this.productTeller.withdraw(0, 1);

      await shouldFail.reverting(this.productTeller.withdraw(0, 1));
    });
    it("should take a product fee", async function() {
      const amount = 2;
      const fee = amount * 500 * productFee;
      await broker.offerCollateral(0, toBytes("ETH"), 10);

      const { logs } = await this.productTeller.withdraw(0, amount);
      expectEvent.inLogs(logs, "Burned", { from: msg.sender, amount: fee });
    });
    it("should calculate the liquidation ratio correctly", async function() {
      //TODO: fix values
      const ethAmount = 1.53457212312387623;
      await broker.offerCollateral(0, toBytes("ETH"), ethAmount);
      const daiAmount = 100.26348934940293934;
      await broker.offerCollateral(0, toBytes("DAI"), daiAmount);
      const wbtcAmount = 0.5689403404820349;
      await broker.offerCollateral(0, toBytes("WBTC"), wbtcAmount);

      const tcv = ethAmount * 100 + daiAmount * 1 + wbtcAmount * 3500;
      const denom =
        (ethAmount * 100) / 1.5 +
        (daiAmount * 1) / 1.01 +
        (wbtcAmount * 3500) / 1.2;
      const expectedLR = tcv / denom;

      const { logs } = await this.productTeller.withdraw(0, 1.5);
      expectEvent.inLogs(logs, "LiquidationRatio", { amount: expectedLR });
    });
    it("should not allow withdrawal if the agreement is uncollaterized", async function() {
      await shouldFail.reverting(this.productTeller.withdraw(0, 1));
    });
  });

  describe("pay()", function() {
    beforeEach(async function() {
      await this.broker.offerCollateral(0, toBytes("ETH"), 10);
      await this.productTeller.withdraw(0, 1);
    });
    it("should burn the product tokens", async function() {
      const tokenAmount = 1;
      const { logs } = await this.productTeller.pay(0, tokenAmount);
      expectEvent.inLogs(logs, "Burned", {
        from: msg.sender,
        amount: tokenAmount
      });
    });
    context("when the debt is partially paid", function() {
      beforeEach(async function() {
        const { logs } = await this.productTeller.pay(0, 0.75);
      });
      it("should take a new fee", async function() {
        expectEvent.inLogs(logs, "Burned", {
          from: msg.sender,
          amount: tokenAmount
        }); //check
      });
      it("should reset liquidation time", async function() {
        const newTime = 0; //TODO
        expectEvent.inLogs(logs, "ResetLiquidation", {
          agreementId: 0,
          time: newTime
        });
      });
      it("should modify the agreement", async function() {
        const agreement = await managingDirector.agreements(0);
        agreement.productDebt.should.equal(0.25);
      });
    });
    context("when the debt is fully paid", function() {
      it("should liquidate the agreement", async function() {
        await this.productTeller.pay(0, 1);
        //TODO
      });
    });
  });
});

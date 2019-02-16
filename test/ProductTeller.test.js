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
    it("should allow an admin to set a product fee");
  });
  describe("withdraw()", function() {
    it("should only mints product tokens when there is no debt");
    it("should take a product fee");
    it("should calculate the liquidation ratio correctly");
    it("should not allow withdrawal if the agreement is uncollaterized");
  });

  describe("pay()", function() {
    it("should burn the product tokens");
  });
  context("when the debt is partially paid", function() {
    it("should take a new fee");
    it("should reset liquidation time");
    it("should modify the agreement");
  });
  context("when the debt is fully paid", function() {
    it("should liquidate the agreement");
  });
});

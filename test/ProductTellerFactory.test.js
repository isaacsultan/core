const {
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
const ProductTeller = artifacts.require("ProductTeller");

contract("ProductTellerFactory", function([_, adminRole, brokerRole, user]) {
  const productType = toBytes("CTB");
  let productTellerFactory,
    managingDirector,
    broker,
    productTokenAddress,
    deltaTokenAddress,
    ticker,
    liquidator,
    compliance;
  beforeEach(async function() {
    [
      productTellerFactory,
      managingDirector,
      broker,
      productTokenAddress,
      deltaTokenAddress,
      ticker,
      liquidator,
      compliance
    ] = await setup(adminRole, brokerRole);
  });
  describe("#makeProductTeller", function() {
    it("reverts if not called by an admin", async function() {
      shouldFail.reverting(
        productTellerFactory.makeProductTeller(
          productType,
          managingDirector.address,
          broker.address,
          productTokenAddress,
          deltaTokenAddress,
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
        productTokenAddress,
        deltaTokenAddress,
        ticker.address,
        liquidator.address,
        compliance.address,
        adminRole,
        { from: adminRole }
      );
      expectEvent.inLogs(logs, "NewProductTeller", {
        productType: padRight(productType, 64),
        productToken: productTokenAddress
      });
    });
    it("should instantiate a ProductTeller at the correct address", async function () {
      await productTellerFactory.makeProductTeller(
        productType,
        managingDirector.address,
        broker.address,
        productTokenAddress,
        deltaTokenAddress,
        ticker.address,
        liquidator.address,
        compliance.address,
        adminRole,
        { from: adminRole }
      );
      await ProductTeller.at(await productTellerFactory.productTellers(0));
    });
  });
  describe("#verify", function() {
    it("should check if a token contract exists", async function() {
      await productTellerFactory.makeProductTeller(
        productType,
        managingDirector.address,
        broker.address,
        productTokenAddress,
        deltaTokenAddress,
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



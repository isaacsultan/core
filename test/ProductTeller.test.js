const {
  BN,
  expectEvent,
  shouldFail,
  time
} = require("openzeppelin-test-helpers");
const setup = require("./productTellerSetup");
const toBytes = web3.utils.utf8ToHex;
const padRight = web3.utils.padRight;
const { wad, ray } = require("./fixedPoint");

const ProductTeller = artifacts.require("ProductTeller");
const AdvancedToken = artifacts.require("ERC777");

contract("ProductTeller", function([_, adminRole, brokerRole, user]) {
  const productType = toBytes("CTB");
  const productFee = wad(2, 2);
  const id = new BN(0);
  const amount = wad(2, 0);
  const smallerAmount = wad(1, 0);
  let productTellerFactory,
    productTeller,
    managingDirector,
    broker,
    productAddress,
    deltaAddress,
    ticker,
    liquidator,
    compliance,
    delta,
    product;
  beforeEach(async function() {
    [
      productTellerFactory,
      managingDirector,
      broker,
      productAddress,
      deltaAddress,
      ticker,
      liquidator,
      compliance
    ] = await setup(adminRole, brokerRole, user);
    productTeller = await ProductTeller.new(
      productType,
      managingDirector.address,
      broker.address,
      productAddress,
      deltaAddress,
      ticker.address,
      liquidator.address,
      compliance.address,
      adminRole
    );
    delta = await AdvancedToken.at(deltaAddress);
    product = await AdvancedToken.at(productAddress);

    const fundAmount = new BN(10);
    await delta.approve(user, fundAmount, {from: adminRole});
    await delta.transferFrom(adminRole, user, amount, {from:user});
  });

  describe("setProductFee", function() {
    it("should allow an admin to set a product fee", async function() {
      productTeller.setProductFee(productFee, { from: adminRole });
    });
  });
  describe("withdraw()", function() {
    beforeEach(async function() {
      await broker.approveProduct(productType, toBytes("BTC"), {
        from: adminRole
      });
      await broker.agree(productType, { from: user });
      productTeller.setProductFee(productFee, { from: adminRole });
    });
    it("should revert when there is already a debt", async function() {
      await broker.offerCollateral(id, toBytes("ETH"), new BN(10), {
        from: user
      });
      await productTeller.withdraw(id, amount);
      await shouldFail.reverting(
        productTeller.withdraw(id, amount, { from: user })
      );
    });
    it("should revert if agreement is uncollaterized", async function() {
      await shouldFail.reverting(
        productTeller.withdraw(id, amount, { from: user })
      );
    });
    it("should emit an event", async function() {
      await broker.offerCollateral(id, toBytes("ETH"), new BN(10), {
        from: user
      });
      const { logs } = await productTeller.withdraw(id, amount, { from: user });

      expectEvent.inLogs(logs, "ProductWithdraw", {
        productType: padRight(productType, 64),
        client: user,
        agreementId: id,
        amount: amount,
        feePaid: 1 //TODO: fee paid
      });
    });
    it("should take a product fee", async function() {
      await broker.offerCollateral(id, toBytes("ETH"), new BN(10), {
        from: user
      });
      await productTeller.withdraw(id, amount, { from: user });

      (await delta.balanceOf(user)).should.be.bignumber.equal(expectedAmount);
    });
    it("should give client product tokens", async function() {
      await broker.offerCollateral(id, toBytes("ETH"), new BN(10), {
        from: user
      });
      await productTeller.withdraw(id, amount, { from: user });

      (await product.balanceOf(user)).should.be.bignumber.equal(amount);
    });
  });
  describe("pay()", function() {
    const fullAmount = new BN(2);
    const partialAmount = new BN(1);
    beforeEach(async function() {
      await broker.offerCollateral(id, toBytes("ETH"), new BN(10), {
        from: user
      });
      await productTeller.withdraw(id, amount, { from: user });
    });
    it("should burn product tokens", async function() {
      await productTeller.pay(id, fullAmount, { from: user });
      (await product.balanceOf(user)).should.be.bignumber.equal(fullAmount);
    });
    it("should burn delta tokens", async function() {
      await productTeller.pay(id, fullAmount, { from: user });
      (await delta.balanceOf(user)).should.be.bignumber.equal(new BN(9));
    });
    context("when the debt is partially paid", function() {
      it("should reset liquidation time", async function() {
        await time.advanceBlock();
        const latestTime = time.latest();
        await productTeller.pay(id, partialAmount);
        (await liquidator.liquidationTimes(id)).should.equal(latestTime);
      });
      it("should modify the agreement", async function() {
        const agreement = await managingDirector.agreements(id);
        agreement.productDebt.should.be.bignumber.equal(new BN(1));
      });
    });
    context("when the debt is fully paid", function() {
      it("should liquidate the agreement");
    });
    it("should emit an event", async function() {
      const { logs } = await productTeller.pay(id, new BN(1), { from: user });
      expectEvent.inLogs(logs, "ProductPay", {
        productType: padRight(productType, 64),
        client: user,
        agreementId: id,
        amount: amount
      });
    });
  });
});

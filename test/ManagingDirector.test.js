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

const ManagingDirector = artifacts.require("ManagingDirector");

contract("ManagingDirector", function([
  _,
  user,
  brokerRole,
  adminRole,
  userTwo
]) {
  const eth = toBytes("ETH");
  const ethRatio = ray(15, 1);
  const dai = toBytes("DAI");
  const daiRatio = ray(13, 1);
  beforeEach(async function() {
    this.managingDirector = await ManagingDirector.new(
      toBytes("Inverse"),
      adminRole
    );
  });
  describe("#addBrokerRole", function() {
    it("should revert if not called by an admin", async function() {
      shouldFail.reverting(
        this.managingDirector.addBrokerRole(adminRole, { from: user })
      );
    });
  });
  describe("#increaseClientCollateralBalance", function() {
    const amountOne = wad(100, 0);
    const amountTwo = wad(10, 1);
    it("should revert if not called by a broker", async function() {
      shouldFail.reverting(
        this.managingDirector.increaseClientCollateralBalance(
          constants.ZERO_ADDRESS,
          eth,
          amountOne
        )
      );
    });
    it("should add the correct amount to clientCollateral", async function() {
      await this.managingDirector.addBrokerRole(brokerRole, {
        from: adminRole
      });
      await this.managingDirector.increaseClientCollateralBalance(
        user,
        eth,
        amountOne,
        { from: brokerRole }
      );
      await this.managingDirector.increaseClientCollateralBalance(
        user,
        eth,
        amountTwo,
        { from: brokerRole }
      );

      const expectedAmount = amountOne.add(amountTwo);
      (await this.managingDirector.clientCollateral(
        user,
        eth
      )).should.be.bignumber.equal(expectedAmount);
    });
    it("should store multiple collateral types in clientCollateral", async function() {
      await this.managingDirector.addBrokerRole(brokerRole, {
        from: adminRole
      });
      await this.managingDirector.increaseClientCollateralBalance(
        user,
        eth,
        amountOne,
        { from: brokerRole }
      );
      await this.managingDirector.increaseClientCollateralBalance(
        user,
        dai,
        amountTwo,
        { from: brokerRole }
      );
      (await this.managingDirector.clientCollateral(
        user,
        eth
      )).should.be.bignumber.equal(amountOne);
      (await this.managingDirector.clientCollateral(
        user,
        dai
      )).should.be.bignumber.equal(amountTwo);
    });
  });
  describe("#originateAgreement", function() {
    const product = toBytes("CTB");
    it("should revert if not called by a broker", async function() {
      shouldFail.reverting(
        this.managingDirector.originateAgreement(user, product)
      );
    });
    it("should store agreement details in agreementOwner", async function() {
      await this.managingDirector.addBrokerRole(brokerRole, {
        from: adminRole
      });
      await this.managingDirector.originateAgreement(user, product, {
        from: brokerRole
      });
      (await this.managingDirector.agreements(0)).product.should.equal(
        padRight(product, 64)
      );
    });
    it("should increment the agreementId", async function() {
      await this.managingDirector.addBrokerRole(brokerRole, {
        from: adminRole
      });
      await this.managingDirector.originateAgreement(user, product, {
        from: brokerRole
      });
      (await this.managingDirector.agreementId()).should.be.bignumber.equal(
        new BN(1)
      );
      await this.managingDirector.originateAgreement(user, product, {
        from: brokerRole
      });
      (await this.managingDirector.agreementId()).should.be.bignumber.equal(
        new BN(2)
      );
    });
  });
  describe("#modifyAgreementOwner", function() {
    it("should revert if not called by a broker", async function() {
      await this.managingDirector.addBrokerRole(brokerRole, {
        from: adminRole
      });
      await this.managingDirector.originateAgreement(user, toBytes("CTB"), {
        from: brokerRole
      });
      shouldFail.reverting(
        this.managingDirector.modifyAgreementOwner(0, userTwo)
      );
    });
  });

  describe("#increaseAgreementCollateral", function() {
    const product = toBytes("CTB");
    const id = new BN(0);
    const collateral = eth;
    const amount = wad(100, 0);
    beforeEach(async function() {
      await this.managingDirector.addBrokerRole(brokerRole, {
        from: adminRole
      });
      await this.managingDirector.originateAgreement(user, product, {
        from: brokerRole
      });
    });
    it("should revert if not called by a broker", async function() {
      shouldFail.reverting(
        this.managingDirector.increaseAgreementCollateral(
          id,
          collateral,
          amount
        )
      );
    });
    it("should increase the collateral amount", async function() {
      await this.managingDirector.increaseAgreementCollateral(
        id,
        collateral,
        amount,
        { from: brokerRole }
      );
      (await this.managingDirector.agreementCollateral(
        0,
        collateral
      )).should.be.bignumber.equal(amount);
    });
  });

  describe("#decreaseAgreementCollateral", function() {
    const product = toBytes("CTB");
    const id = new BN(0);
    const collateral = eth;
    const amount = wad(100, 0);
    beforeEach(async function() {
      await this.managingDirector.addBrokerRole(brokerRole, {
        from: adminRole
      });
      await this.managingDirector.originateAgreement(user, product, {
        from: brokerRole
      });
    });
    it("should revert if not called by a broker", async function() {
      shouldFail.reverting(
        this.managingDirector.decreaseAgreementCollateral(
          id,
          collateral,
          amount
        )
      );
    });
    it("should revert if collateral is decreased below zero", async function() {
      const smallAmount = wad(10, 0);
      await this.managingDirector.increaseAgreementCollateral(
        id,
        collateral,
        smallAmount,
        { from: brokerRole }
      );
      shouldFail.reverting(
        this.managingDirector.decreaseAgreementCollateral(
          id,
          collateral,
          amount,
          { from: brokerRole }
        )
      );
    });
    it("should reduce the collateral amount", async function() {
      const largeAmount = wad(150, 0);
      await this.managingDirector.increaseAgreementCollateral(
        id,
        collateral,
        largeAmount,
        { from: brokerRole }
      );
      await this.managingDirector.decreaseAgreementCollateral(
        id,
        collateral,
        amount,
        { from: brokerRole }
      );
      const expectedAmount = largeAmount.sub(amount);
      (await this.managingDirector.agreementCollateral(
        0,
        collateral
      )).should.be.bignumber.equal(expectedAmount);
    });
  });

  describe("#mintAgreementProduct", function() {
    const id = new BN(0);
    const amount = wad(1, 0);
    const targetPrice = ray(100, 0);
    const underlyingPrice = ray(105, 0);
    beforeEach(async function() {
      await this.managingDirector.addBrokerRole(brokerRole, {
        from: adminRole
      });
      await this.managingDirector.originateAgreement(user, toBytes("CTB"), {
        from: brokerRole
      });
    });
    it("should revert if not called by a broker", async function() {
      shouldFail.reverting(
        this.managingDirector.mintAgreementProduct(
          id,
          amount,
          targetPrice,
          underlyingPrice
        )
      );
    });
    it("should store agreement details in agreements", async function() {
      await this.managingDirector.mintAgreementProduct(
        id,
        amount,
        targetPrice,
        underlyingPrice,
        { from: brokerRole }
      );
      const testAgreement = await this.managingDirector.agreements(0);
      testAgreement.targetPrice.should.be.bignumber.equal(targetPrice);
      testAgreement.underlyingPrice.should.be.bignumber.equal(underlyingPrice);
      testAgreement.productDebt.should.be.bignumber.equal(amount);
    });
  });
  describe("#resetAgreement", function() {
    it("should revert if not called by a broker", async function() {
      shouldFail.reverting(
        this.managingDirector.mintAgreementProduct(
          new BN(0),
          wad(1, 0),
          ray(100, 0),
          ray(105, 0)
        )
      );
    });
  });
});

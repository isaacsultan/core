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
        this.managingDirector.modifyClientCollateralBalance(
          constants.ZERO_ADDRESS,
          toBytes("ETH"),
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
        toBytes("ETH"),
        amountOne,
        { from: brokerRole }
      );
      await this.managingDirector.increaseClientCollateralBalance(
        user,
        toBytes("ETH"),
        amountTwo,
        { from: brokerRole }
      );

      const expectedAmount = amountOne.add(amountTwo);
      (await this.managingDirector.clientCollateral(
        user,
        toBytes("ETH")
      )).should.be.bignumber.equal(expectedAmount);
    });
    it("should store multiple collateral types in clientCollateral", async function() {
      await this.managingDirector.addBrokerRole(brokerRole, {
        from: adminRole
      });
      await this.managingDirector.increaseClientCollateralBalance(
        user,
        toBytes("ETH"),
        amountOne,
        { from: brokerRole }
      );
      await this.managingDirector.increaseClientCollateralBalance(
        user,
        toBytes("DAI"),
        amountTwo,
        { from: brokerRole }
      );
      (await this.managingDirector.clientCollateral(
        user,
        toBytes("ETH")
      )).should.be.bignumber.equal(amountOne);
      (await this.managingDirector.clientCollateral(
        user,
        toBytes("DAI")
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
      shouldFail.reverting(
        this.managingDirector.modifyAgreementOwner(userTwo, {
          from: brokerRole
        })
      );
    });
  });
  describe("#modifyAgreementCollateral", function() {
    const product = toBytes("CTB");
    const id = new BN(0);
    const collateral = toBytes("ETH");
    const positiveAmount = wad(100, 0);
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
        this.managingDirector.modifyAgreementCollateral(
          id,
          collateral,
          positiveAmount
        )
      );
    });
    it("should add a new collateral if that collateral does not already exist", async function() {
      await this.managingDirector.modifyAgreementCollateral(
        id,
        collateral,
        positiveAmount,
        { from: brokerRole }
      );
      (await this.managingDirector.collateralPosition(
        0,
        collateral
      )).should.be.bignumber.equal("1");
      //TODO: Access Collateral Array
      //(await this.managingDirector.agreements(0)).collateralTypes.should.equal(["ETH"])
      const collateralTwo = toBytes("DAI");
      await this.managingDirector.modifyAgreementCollateral(
        id,
        collateralTwo,
        positiveAmount,
        { from: brokerRole }
      );
      (await this.managingDirector.collateralPosition(
        0,
        collateralTwo
      )).should.be.bignumber.equal("2");
    });
    it("should not add a new collateral if one of same type already exists"); //TODO: after fixes
    it("should not add new collateral if the amount is zero or negative", async function() {
      //TODO: Fix modify agreement collateral
      await this.managingDirector.modifyAgreementCollateral(
        id,
        collateral,
        wad(0, 0),
        { from: brokerRole }
      );
      (await this.managingDirector.collateralPosition(
        0,
        collateral
      )).should.be.bignumber.equal("0");
    });
    it("should calculate the new amount correctly");
    it("should remove the collateral if new amount is zero");
  });
  describe("#mintAgreementProduct", async function() {
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

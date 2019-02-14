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

const BasicTokenFactory = artifacts.require("BasicTokenFactory");
const Broker = artifacts.require("Broker");
const ManagingDirector = artifacts.require("ManagingDirector");
const Compliance = artifacts.require("Compliance");
const EthTeller = artifacts.require("EthTeller");
const Erc20TellerFactory = artifacts.require("Erc20TellerFactory");
const Ticker = artifacts.require("MockTicker");

contract("Broker", function([_, adminRole, brokerRole, user, userTwo]) {
  const product = toBytes("CTB");
  const underlying = toBytes("BTC");
  const id = new BN(0);
  beforeEach(async function() {
    this.managingDirector = await ManagingDirector.new(
      toBytes("inverse"),
      adminRole
    );
    this.erc20TellerFactory = await Erc20TellerFactory.new(adminRole);
    this.ethTeller = await EthTeller.new(
      this.managingDirector.address,
      adminRole
    );
    this.basicTokenFactory = await BasicTokenFactory.new(adminRole);
    this.basicTokenFactory.makeBasicToken(
      "Delta",
      "DLT",
      new BN(18),
      [constants.ZERO_ADDRESS],
      constants.ZERO_ADDRESS,
      new BN(100000000),
      { from: adminRole }
    );
    this.ticker = await Ticker.new(this.managingDirector.address);
    this.compliance = await Compliance.new(
      this.managingDirector.address,
      this.ticker.address,
      adminRole
    );
    this.broker = await Broker.new(
      this.managingDirector.address,
      this.basicTokenFactory.address,
      this.compliance.address,
      this.ethTeller.address,
      this.erc20TellerFactory.address,
      adminRole
    );
    await this.managingDirector.addBrokerRole(this.broker.address, {
      from: adminRole
    });
  });

  describe("approveProduct()", function() {
    it("should allow an admin to approve a new product type", async function() {
      const { logs } = await this.broker.approveProduct(product, underlying, {
        from: adminRole
      });
      expectEvent.inLogs(logs, "NewProductType", {
        productType: padRight(product, 64),
        underlyingType: padRight(underlying, 64)
      });
    });
  });

  describe("agree()", function() {
    it("should revert if an invalid product type is unapproved", async function() {
      shouldFail.reverting(this.broker.agree(toBytes("DENT"), {from: user}));
    });
    context("a valid product type is approved", function() {
      beforeEach(async function() {
        //await this.managingDirector.addBrokerRole(this.broker.address, {
        //  from: adminRole
        //});
        await this.broker.approveProduct(product, underlying, {
          from: adminRole
        });
      });
      it("should emit an event with agreement details", async function() {
        var { logs } = await this.broker.agree(product, {
          from: user
        });
        expectEvent.inLogs(logs, "NewAgreement", {
          client: user,
          id: id,
          product: padRight(product, 64)
        });
        //
        var { logs } = await this.broker.agree(product, {
          from: user
        });
        expectEvent.inLogs(logs, "NewAgreement", {
          client: user,
          id: new BN(1),
          product: padRight(product, 64)
        });
      });
    });
  });

  describe("transferOwnership()", function() {
    beforeEach(async function() {
      //await this.managingDirector.addBrokerRole(this.broker.address, {
      //  from: adminRole
      //});
      await this.broker.approveProduct(product, underlying, {
        from: adminRole
      });
      await this.broker.agree(product, {
        from: user
      });
    });
    it("should revert if the user does not own the agreement", async function() {
      shouldFail.reverting(
        this.broker.transferOwnership(0, user, { from: userTwo })
      );
    });
    it("should emit an event on transfer of ownership", async function() {
      const { logs } = await this.broker.transferOwnership(0, userTwo, {
        from: user
      });
      expectEvent.inLogs(logs, "AgreementTransfer", {
        id: new BN(0),
        from: user,
        to: userTwo
      });
    });
  });

  describe("offerCollateral()", function() {
    const amount = new wad(1, 0);
    const eth = toBytes("ETH");
    const dai = toBytes("DAI");
    beforeEach(async function() {
      //await this.managingDirector.addBrokerRole(brokerRole, {
      //  from: adminRole
      //});
      await this.managingDirector.originateAgreement(user, toBytes("CTB"), {
       from: this.broker.address
      });
    });
    it("should pass", async function() {
      const one = 1
      one.should.equal(1);
    });
    it("should require a valid collateral type", async function() {
      await shouldFail.reverting(
        this.broker.offerCollateral(id, toBytes("DENT"), amount, {from: user})
      );
    });
    it("should require a valid agreementID", async function() {
      await shouldFail.reverting(this.broker.offerCollateral(0, eth, amount, {from: user}));
    });
    it("should revert if agreement already fully collateralized", async function() {
      await this.managingDirector.increaseAgreementCollateral(
        0,
        dai,
        wad(10000, 0),
        { from: this.broker.address }
      );
      shouldFail.reverting(this.broker.offerCollateral(0, dai, wad(1, 0)), {
        from: user
      });
    });
    context("ETH tokens are offered as collateral", function() {
      it("should deposit tokens in EthTeller", async function() {
        await balance
          .difference(this.ethTeller.address, async () => {
            await this.broker.offerCollateral(0, eth, amount, {
              from: user
            });
          })
          .should.be.bignumber.equal(amount);
      });
      it("should emit an event", async function() {
        const { logs } = await this.broker.offerCollateral(0, eth, amount, {
          from: user
        });
        expectEvent.inLogs(logs, "CollateralOffer", {
          client: user,
          id: 0,
          collateral: eth,
          amount: amount
        });
      });
    });
    context("ERC20 tokens are offered as collateral", function() {
      it("should deposit tokens", async function() {
        await this.broker.offerCollateral(0, dai, amount, {
          from: user
        });
      });
      //  it("should emit an event", async function() {
      //    const { logs } = await this.broker.offerCollateral(
      //      0,
      //      dai,
      //      amount,
      //      { from: user }
      //    );
      //    expectEvent.inLogs(logs, "CollateralOffer", {
      //      client: user,
      //      id: 0,
      //      collateral: dai,
      //      amount: amount
      //    });
      //  });
      //});
    });

    //describe("withdrawCollateral()", function() {
    //  it("should revert if uncollateralised", async function() {
    //    await this.broker.approveProduct(product, underlying, {
    //      from: adminRole
    //    });
    //    await this.broker.agree(product, { from: brokerRole });
    //    await shouldFail.reverting(
    //      this.broker.withdrawCollateral(id, dai, new BN(1))
    //    );
    //  });
    //  context("collateral type is ETH", function() {
    //    it("should withdraw");
    //  });
    //  context("collateral type is ERC20", function() {
    //    it("should withdraw");
    //  });
  });
});
//;

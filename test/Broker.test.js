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

const BasicTokenFactory = artifacts.require("BasicTokenFactory");
const Broker = artifacts.require("Broker");
const ManagingDirector = artifacts.require("ManagingDirector");
const Compliance = artifacts.require("Compliance");
const EthTeller = artifacts.require("EthTeller");
const Erc20TellerFactory = artifacts.require("Erc20TellerFactory");
const Ticker = artifacts.require("MockTicker");

contract("Broker", function([_, adminRole, brokerRole]) {
  beforeEach(async function() {
    this.managingDirector = await ManagingDirector.new(
      toBytes("inverse"),
      adminRole,
      brokerRole
    );
    this.erc20TellerFactory = await Erc20TellerFactory.new(adminRole);
    this.ethTeller = await EthTeller.new(
      this.managingDirector.address,
      adminRole
    );
    this.basicTokenFactory = await BasicTokenFactory.new(adminRole);
    this.ticker = await Ticker.new(this.managingDirector.address);
    this.compliance = await Compliance.new(
      this.managingDirector.address,
      this.ticker.address
    );
    this.broker = await Broker.new(
      this.managingDirector.address,
      this.basicTokenFactory.address,
      this.compliance.address,
      this.ethTeller.address,
      this.erc20TellerFactory.address,
      adminRole,
    );
  });

  describe("approveProduct()", function() {
    it("should allow an admin to approve a new product type", async function() {
      const { logs } = await this.broker.approveProduct(
        toBytes("CTB"),
        toBytes("BTC"),
        { from: adminRole }
      );
      expectEvent.inLogs(logs, "NewProductType", {
        productType: padRight(toBytes("CTB"), 64),
        underlyingType: padRight(toBytes("BTC"), 64)
      });
    });
  });
  describe("agree()", function() {
    it("should revert if an invalid product type is unapproved", async function() {
      await shouldFail.reverting(this.broker.agree(toBytes("DENT")));
    });
    context("a valid product type is approved", function() {
      beforeEach(async function() {
        await this.broker.approveProduct(toBytes("CTB"), toBytes("BTC"), {
          from: adminRole
        });
      });
      it("should return a unique ID for each agreement", async function() {
        console.log(brokerRole);
        let { logs } = await this.broker.agree(toBytes("CTB"), {
          from: brokerRole
        });
        expectEvent.inLogs(logs, "NewAgreement", { id: 0 });

        await this.broker.agree(toBytes("CTB"), { from: brokerRole });
        expectEvent.inLogs(logs, "NewAgreement", { id: 1 });
      });
      it("should originate an agreement with the correct product type", async function() {
        const { logs } = await this.broker.agree(toBytes("CTB"), {
          from: brokerRole
        });
        expectEvent.inLogs(logs, "NewAgreement", { product: toBytes("CTB") });
      });
    });
  });
  describe("offerCollateral()", function() {
    it("should require a valid collateral type", async function() {
      await this.broker.approveProduct(toBytes("CTB"), toBytes("BTC"), {
        from: adminRole
      });
      const id = await this.broker.agree(toBytes("CTB"), { from: brokerRole });
      await shouldFail.reverting(
        this.broker.offerCollateral(id, toBytes("DENT"), 1)
      );
    });
    it("should require a valid agreementID", async function() {
      await shouldFail.reverting(
        this.broker.offerCollateral(0, toBytes("ETH"), 1)
      );
    });
    context("agreement is already collateralized", function() {
      it("should deposit tokens", async function() {
        //TODO
      });
    });
    context("agreement is uncollateralized", function() {
      it("should modify the agreement", async function() {
        //TODO
      });
    });
  });
  describe("withdrawCollateral()", function() {
    it("should revert if uncollateralised", async function() {
      await this.broker.approveProduct(toBytes("CTB"), toBytes("BTC"), {
        from: adminRole
      });
      const id = await this.broker.agree(toBytes("CTB"), { from: brokerRole });
      await shouldFail.reverting(id, 1, "DAI");
    });
    context("collateral type is ETH", function() {
      it("should withdraw", async function() {
        //TODO
      });
    });
    context("collateral type is ERC20", function() {
      it("should withdraw", async function() {
        //TODO
      });
    });
  });
});

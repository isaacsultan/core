const {
  BN,
  shouldFail,
  constants,
  balance,
  send,
  ether
} = require("openzeppelin-test-helpers");
const { expectEvent } = require("./expectEventExtended");
const toBytes = web3.utils.utf8ToHex;
const padRight = web3.utils.padRight;
const { wad, ray } = require("./fixedPoint");

const Compliance = artifacts.require("Compliance");
const ManagingDirector = artifacts.require("ManagingDirector");
const Ticker = artifacts.require("MockTicker");

contract("Compliance", function([adminRole, brokerRole, user]) {
  const eth = toBytes("ETH");
  const dai = toBytes("DAI");
  const wbtc = toBytes("WBTC");
  const ethRatio = ray(15, 1);
  const daiRatio = ray(12, 1);
  const wbtcRatio = ray(135, 2);
  const daiAmount = wad(5234, 0);
  beforeEach(async function() {
    this.managingDirector = await ManagingDirector.new(
      toBytes("inverse"),
      adminRole
    );
    this.ticker = await Ticker.new(this.managingDirector.address);
    await this.managingDirector.addBrokerRole(brokerRole, {
      from: adminRole
    });
    this.compliance = await Compliance.new(
      this.managingDirector.address,
      this.ticker.address,
      adminRole
    );
    this.compliance.addCollateralType(eth, ethRatio, { from: adminRole });
    this.compliance.addCollateralType(dai, daiRatio, { from: adminRole });
    this.compliance.addCollateralType(wbtc, wbtcRatio, { from: adminRole });
    await this.managingDirector.originateAgreement(user, toBytes("CTB"), {
      from: brokerRole
    });
    const ethAmount = wad(123, 1);
    const wbtcAmount = wad(317, 2);
    await this.managingDirector.increaseAgreementCollateral(0, eth, ethAmount, {
      from: brokerRole
    });
    await this.managingDirector.increaseAgreementCollateral(0, dai, daiAmount, {
      from: brokerRole
    });
    await this.managingDirector.increaseAgreementCollateral(
      0,
      wbtc,
      wbtcAmount,
      { from: brokerRole }
    );
  });
  describe("#collateralizationParams", function() {
    it("should emit an event with the correct total collateral value", async function() {
      const { logs } = await this.compliance.collateralizationParams(0);
      const expectedTCV = new wad(17559, 0); // 17559

      expectEvent.inLogs(logs, "CollateralizationParameters", {
        id: new BN(0),
        totalCollateralValue: expectedTCV
      });
    });
    it("should emit an event with the correct liquidation ratio", async function() {
      const { logs } = await this.compliance.collateralizationParams(0);
      const expectedLR = "401604238211331150073951840663855423727"; // TODO: 4.016042382113311500739518406638554237279521015706930464939...

      expectEvent.inLogs(
        logs,
        "CollateralizationParameters",
        {
          id: "0",
          liquidationRatio: expectedLR
        },
        true
      );
    });
  });
  describe("#collateralizationParamsAfterChange", function() {
    const collateral = toBytes("DAI");
    const amount = daiAmount.sub(wad(10, 0));
    it("should revert if new collateral quantity is less than zero", async function() {
      const largeAmount = daiAmount.add(wad(10, 0));
      shouldFail.reverting(
        this.compliance.collateralizationParamsAfterChange(
          0,
          collateral,
          largeAmount
        )
      );
    });
    it("should emit an event with the correct total collateral value", async function() {
      const { logs } = await this.compliance.collateralizationParamsAfterChange(
        0,
        collateral,
        amount
      );
      const expectedTCV = new wad(17558, 0); // TODO: FIX!

      expectEvent.inLogs(logs, "CollateralizationParameters", {
        id: new BN(0),
        totalCollateralValue: expectedTCV
      });
    });
    it("should emit an event with the correct liquidation ratio", async function() {
      const { logs } = await this.compliance.collateralizationParamsAfterChange(
        0,
        collateral,
        amount
      );
      const expectedLR = "6598647125140924464487034949267192785"; // // TODO: FIX!

      expectEvent.inLogs(
        logs,
        "CollateralizationParameters",
        {
          id: "0",
          liquidationRatio: expectedLR
        },
        true
      );
    });
  });
});

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
  let managingDirector, ticker, compliance;
  beforeEach(async function() {
    managingDirector = await ManagingDirector.new(
      toBytes("inverse"),
      adminRole
    );
    ticker = await Ticker.new(managingDirector.address);
    await managingDirector.addBrokerRole(brokerRole, {
      from: adminRole
    });
    compliance = await Compliance.new(
      managingDirector.address,
      ticker.address,
      adminRole
    );
  });
  describe("#addCollateralType", function() {
    it("should revert if not called by an admin", async function() {
      shouldFail.reverting(
        compliance.addCollateralType(eth, ethRatio, { from: user })
      );
    });
    it("should add an a collateral to the system", async function() {
      compliance.addCollateralType(eth, ethRatio, { from: adminRole });
      (await compliance.collaterals(0))["name"].should.equal(padRight(eth, 64));
    });
    it("should approve the collateral", async function() {
      compliance.addCollateralType(eth, ethRatio, { from: adminRole });
      (await compliance.approvedCollaterals(eth)).should.be.true;
    });
  });

  describe("#collateralizationParams", function() {
    beforeEach(async function() {
      await managingDirector.originateAgreement(user, toBytes("CTB"), {
        from: brokerRole
      });
    });
    context("no collateral approved", function() {
      it("should return zero values when there is no collateral in an agreement", async function() {
        const { logs } = await compliance.collateralizationParams(0);
        expectEvent.inLogs(logs, "CollateralizationParameters", {
          id: new BN(0),
          totalCollateralValue: new BN(0),
          liquidationRatio: new BN(0)
        });
      });
    });
    context("collaterals ETH, DAI & WBTC have been approved", function() {
      beforeEach(async function() {
        await compliance.addCollateralType(eth, ethRatio, { from: adminRole });
        await compliance.addCollateralType(dai, daiRatio, { from: adminRole });
        await compliance.addCollateralType(wbtc, wbtcRatio, {
          from: adminRole
        });

        const ethAmount = wad(123, 1);
        console.log(ethAmount.toString());
        const wbtcAmount = wad(317, 2);
        await managingDirector.increaseAgreementCollateral(0, eth, ethAmount, {
          from: brokerRole
        });
        await managingDirector.increaseAgreementCollateral(0, dai, daiAmount, {
          from: brokerRole
        });
        await managingDirector.increaseAgreementCollateral(
          0,
          wbtc,
          wbtcAmount,
          { from: brokerRole }
        );
      });
      it("should emit an event with the correct total collateral value", async function() {
        const { logs } = await compliance.collateralizationParams(0);
        const expectedTCV = new wad(17559, 0); // 17559

        expectEvent.inLogs(logs, "CollateralizationParameters", {
          id: new BN(0),
          totalCollateralValue: expectedTCV
        });
      });
      it("should emit an event with the correct liquidation ratio", async function() {
        const { logs } = await compliance.collateralizationParams(0);
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
  });

  describe("#collateralizationParamsAfterChange", function() {
    const collateral = toBytes("DAI");
    const amount = daiAmount.sub(wad(10, 0));
    context("collaterals ETH, DAI & WBTC have been approved", function() {
      beforeEach(async function() {
        compliance.addCollateralType(eth, ethRatio, { from: adminRole });
        compliance.addCollateralType(dai, daiRatio, { from: adminRole });
        compliance.addCollateralType(wbtc, wbtcRatio, { from: adminRole });
        await managingDirector.originateAgreement(user, toBytes("CTB"), {
          from: brokerRole
        });
        const ethAmount = wad(123, 1);
        console.log(ethAmount.toString());
        const wbtcAmount = wad(317, 2);
        await managingDirector.increaseAgreementCollateral(0, eth, ethAmount, {
          from: brokerRole
        });
        await managingDirector.increaseAgreementCollateral(0, dai, daiAmount, {
          from: brokerRole
        });
        await managingDirector.increaseAgreementCollateral(
          0,
          wbtc,
          wbtcAmount,
          { from: brokerRole }
        );
      });

      it("should revert if new collateral quantity is less than zero", async function() {
        const largeAmount = daiAmount.add(wad(10, 0));
        shouldFail.reverting(
          compliance.collateralizationParamsAfterChange(
            0,
            collateral,
            largeAmount
          )
        );
      });
      it("should emit an event with the correct total collateral value", async function() {
        const { logs } = await compliance.collateralizationParamsAfterChange(
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
        const { logs } = await compliance.collateralizationParamsAfterChange(
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
});

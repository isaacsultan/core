const mode = process.env.MODE;

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
const Erc20Teller = artifacts.require("Erc20Teller");
const BasicTokenFactory = artifacts.require("BasicTokenFactory");
const BasicToken = artifacts.require("ERC777");

contract("Erc20Teller", function([_, adminRole, user]) {
  const dai = toBytes("DAI");
  let daiAddress;
  const amount = wad(1, 0);
  beforeEach(async function() {
    this.managingDirector = await ManagingDirector.new(
      toBytes("inverse"),
      adminRole
    );
    this.basicTokenFactory = await BasicTokenFactory.new(adminRole);
    const approvedOperators = [adminRole];
    await this.basicTokenFactory.makeBasicToken(
      toBytes("MakerDao-DAI"),
      dai,
      new BN(18),
      approvedOperators,
      adminRole,
      new BN(100000000),
      { from: adminRole }
    );
    const daiAddress = await this.basicTokenFactory.basicTokens(0);
    this.daiToken = await BasicToken.at(daiAddress);

    this.erc20Teller = await Erc20Teller.new(
      this.managingDirector.address,
      dai,
      daiAddress,
      adminRole
    );
    await this.managingDirector.addBrokerRole(this.erc20Teller.address, {
      from: adminRole
    });
  });
  describe("setParameters()", function() {
    const liquidityRatio = ray(15, 1);
    const liquidationFee = ray(2, 2);
    it("should revert if not called by an admin", async function() {
      shouldFail.reverting(
        this.erc20Teller.setParameters(liquidityRatio, liquidationFee, {
          from: user
        })
      );
    });
    it("should allow admin to set liquidity parameters", async function() {
      const { logs } = await this.erc20Teller.setParameters(
        liquidityRatio,
        liquidationFee,
        {
          from: adminRole
        }
      );
      expectEvent.inLogs(logs, "Erc20TellerParams", {
        tellerType: padRight(dai, 64),
        tokenAddress: this.daiToken.address,
        liquidityRatio: liquidityRatio,
        liquidationFee: liquidationFee
      });
    });
  });
  describe("deposit()", function() {
    it("should revert if tokens are not approved for transfer", async function() {
      shouldFail.reverting(this.erc20Teller.deposit(amount, { from: user }));
    });
    context("tokens are approved by client", function() {
      beforeEach(async function() {
        await this.daiToken.approve(this.erc20Teller.address, amount, { from: user });
      });
      it("should transfer the collateral token to CollateralTeller");
      it("should increase the users collateral balance");
    });
  });
  describe("withdraw()", function() {
    it("should revert if there not sufficient collateral", async function() {
      shouldFail.reverting(this.erc20Teller.withdraw(amount), { from: user });
    });
    it("should transfer the collateral token to the user");
    it("should decrease the users collateral balance");
  });
});

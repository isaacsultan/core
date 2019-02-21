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
const ERC20Mock = artifacts.require("ERC20Mock");

contract("Erc20Teller", function([_, adminRole, user]) {
  const dai = toBytes("DAI");
  const amount = wad(2, 0);
  const smallerAmount = wad(1, 0);
  let daiAddress, convertedAmount, convertedSmallerAmount;
  beforeEach(async function() {
    daiAddress = (await web3.eth.getAccounts())[5];
    this.daiToken = await ERC20Mock.new(daiAddress, 100 * 10 ** 6);
    this.managingDirector = await ManagingDirector.new(
      toBytes("inverse"),
      adminRole
    );
    this.erc20Teller = await Erc20Teller.new(
      this.managingDirector.address,
      dai,
      this.daiToken.address,
      adminRole
    );
    convertedAmount = web3.utils.fromWei(amount);
    convertedSmallerAmount = web3.utils.fromWei(smallerAmount);

    await this.managingDirector.addBrokerRole(this.erc20Teller.address, {
      from: adminRole
    });
    await this.daiToken.approve(user, convertedAmount, { from: daiAddress });
    await this.daiToken.transferFrom(daiAddress, user, convertedAmount, {
      from: user
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
      shouldFail.reverting(
        this.erc20Teller.deposit(convertedAmount, { from: user })
      );
    });
    context("tokens are approved by client", function() {
      beforeEach(async function() {
        await this.daiToken.approve(this.erc20Teller.address, convertedAmount, {
          from: user
        });
      });
      it("should transfer the collateral token to CollateralTeller", async function() {
        await this.erc20Teller.deposit(convertedAmount, { from: user });
        (await this.daiToken.balanceOf(
          this.erc20Teller.address
        )).should.be.bignumber.equal(convertedAmount);
      });
      it("should increase the users collateral balance", async function() {
        await this.erc20Teller.deposit(convertedAmount, { from: user });
        (await this.managingDirector.clientCollateral(
          user,
          dai
        )).should.be.bignumber.equal(convertedAmount);
      });
      it("should emit an event", async function() {
        const { logs } = await this.erc20Teller.deposit(convertedAmount, {
          from: user
        });
        expectEvent.inLogs(logs, "CollateralDeposit", {
          client: user,
          tellerType: padRight(dai, 64),
          amount: convertedAmount
        });
      });
    });
  });
  describe("withdraw()", function() {
    beforeEach(async function() {
      await this.daiToken.approve(this.erc20Teller.address, convertedAmount, {
        from: user
      });
      await this.erc20Teller.deposit(convertedAmount, { from: user });
    });
    it("should revert if there not sufficient collateral", async function() {
      shouldFail.reverting(this.erc20Teller.withdraw(convertedAmount), { from: user });
    });
    it("should transfer the collateral token to the user", async function() {
      await this.erc20Teller.withdraw(convertedSmallerAmount, { from: user });
      const expectedAmount = convertedAmount.sub(convertedAmount);
      (await this.daiToken.balanceOf(user)).should.be.bignumber.equal(expectedAmount);
    });
    it("should decrease the users collateral balance", async function() {
      await this.erc20Teller.withdraw(convertedSmallerAmount, { from: user });

      const expectedAmount = convertedAmount.sub(convertedAmount);
      (await this.managingDirector.clientCollateral(
        user,
        dai
      )).should.be.bignumber.equal(expectedAmount);
    });
    it("should emit an event", async function() {
      const { logs } = await this.erc20Teller.withdraw(convertedSmallerAmount, {
        from: user
      });
      expectEvent.inLogs(logs, "CollateralWithdraw", {
        client: user,
        tellerType: padRight(dai, 64),
        amount: convertedSmallerAmount
      });
    });
  });
});

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
  const EthTeller = artifacts.require("EthTeller");

contract("EthTeller", function([_, adminRole, brokerRole, user]) {
    beforeEach(async function() {
      this.managingDirector = await ManagingDirector.new(
        toBytes("inverse"),
        adminRole,
        brokerRole
      );
      this.ethTeller = await EthTeller.new(
        this.managingDirector.address,
        adminRole
      );
    });
    describe("#setParameters", function() {
      it("should allow admin to set liquidity ratio and liquidity fee of ether", async function() {
        const lr = ray(15, 1); // 1.5
        const lf = wad(1, 2); // 0.1
        const { logs } = await this.ethTeller.setParameters(lr, lf, {
          from: adminRole
        });
  
        expectEvent.inLogs(logs, "CollateralParameters", {
          collateralType: padRight(toBytes("ETH"), 64),
          liquidityRatio: lr,
          liquidityFee: lf
        });
      });
    });
    describe("#deposit", async function() {
      const value = ether("10");
      it("should revert if not called by an admin contract", async function () {
          shouldFail.reverting(this.ethTeller.deposit({ from: user, value: value }))
      });
      it("should increase the balance of CollateralTeller when ether is sent", async function() {
      //TODO: Fix admin permissions in managingDirector.modifyClientCollateralBalance
      (await balance.difference(this.ethTeller.address, async () => {
          await this.ethTeller.deposit({ from: user, value: value });
        })
      ).should.be.bignumber.equal(value);
      });
      it("should add to users ETH collateral balance", async function () {
          await this.ethTeller.deposit({ from: user, value: value });
          clientCollateral(user, toBytes("ETH")).should.be.bignumber.equal(value);
      });
    });
    describe("#withdraw", async function() {
      const value = ether("10");
      it("should revert if not called by an admin contract", async function () {
          shouldFail.reverting(this.ethTeller.withdraw(value));
      });
      it("should revert if there not sufficient collateral", async function () {
          shouldFail.reverting(this.ethTeller.withdraw(value), {from: user})
      });
      it("should decrease the balance of CollateralTeller when ether is sent", async function() {
          await this.ethTeller.deposit({ from: user, value: value }); 
          //TODO: Fix admin permissions in managingDirector.modifyClientCollateralBalance
          (await balance.difference(this.ethTeller.address, async () => {
              await this.ethTeller.withdraw(ether("6")); 
            })
          ).should.be.bignumber.equal(ether("4"));
      });
      it("should remove from the users ETH collateral balance", async function () {
          await this.ethTeller.deposit({ from: user, value: value });
          await this.ethTeller.withdraw(ether("6")); 
          clientCollateral(user, toBytes("ETH")).should.be.bignumber.equal(toBytes("4"));
      });
    });
  });
  
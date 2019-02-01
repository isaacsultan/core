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

const ManagingDirector = artifacts.require("ManagingDirector");
const Erc20TellerFactory = artifacts.require("Erc20TellerFactory");
const EthTeller = artifacts.require("EthTeller");

contract("Erc20Teller", function([_, adminRole, brokerRole]) {
  beforeEach(async function() {
    this.managingDirector = await ManagingDirector.new(
      toBytes("inverse"),
      adminRole,
      brokerRole
    );
    this.erc20TellerFactory = await Erc20TellerFactory.new(adminRole);
  });
  describe("setParameters()", function() {
    it("should allow admin to set liquidity parameters", async function() {
      var { logs } = await this.erc20Teller.setParameters(1, 1, {
        from: adminRole
      }); //TODO: set in appropriate range
      expectEvent.inLogs(logs, "NewErc20TellerParams", {
        tellerType: toBytes("DAI"),
        liquidityRatio: 1,
        liquidationFee: 1
      });
    });
  });
  describe("deposit()", function() {});
  describe("withdraw()", function() {});
});

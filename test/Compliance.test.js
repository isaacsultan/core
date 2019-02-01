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
const Erc20TellerFactory = artifacts.require("Erc20TellerFactory");
const Ticker = artifacts.require("MockTicker");

contract("Compliance", function([adminRole]) {
  beforeEach(async function() {
    this.managingDirector = await ManagingDirector.new(
      toBytes("inverse"),
      adminRole,
      brokerRole
    );
    this.ticker = await Ticker.new(this.managingDirector.address);
  });
  describe("#collateralizationParams", async function() {
  });
});

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

const AdvancedTokenFactory = artifacts.require("AdvancedTokenFactory");
const AdvancedToken = artifacts.require("ERC777");

contract("AdvancedTokenFactory", function([_, adminRole]) {
  const name = "ConverseTrackingBitcoin";
  const symbol = "CTB";
  const granularity = new BN(18);
  const burnOperator = adminRole;
  const approvedOperators = [adminRole];
  const initialSupply = new BN(100000000);

  beforeEach(async function() {
    this.AdvancedTokenFactory = await AdvancedTokenFactory.new(adminRole);
  });
  describe("#makeAdvancedToken", function() {
    it("reverts if not called by an admin", async function() {
      shouldFail.reverting(
        this.AdvancedTokenFactory.makeAdvancedToken(
          name,
          symbol,
          granularity,
          approvedOperators,
          burnOperator,
          initialSupply
        )
      );
    });
    it("adds a new token", async function() {
      const { logs } = await this.AdvancedTokenFactory.makeAdvancedToken(
        name,
        symbol,
        granularity,
        approvedOperators,
        burnOperator,
        initialSupply,
        { from: adminRole }
      );
      expectEvent.inLogs(logs, "NewAdvancedToken", {
        name: name,
        symbol: symbol,
        granularity: granularity,
        initialSupply: initialSupply
      });
    });
    it("should instantiate an AdvancedToken at the correct address", async function () {
      await this.AdvancedTokenFactory.makeAdvancedToken(
        name,
        symbol,
        granularity,
        approvedOperators,
        burnOperator,
        initialSupply,
        { from: adminRole }
      );
      await AdvancedToken.at(await this.AdvancedTokenFactory.advancedTokens(0));
    });
  });
  describe("#verify", function() {
    it("should check if a token contract exists", async function() {
        await this.AdvancedTokenFactory.makeAdvancedToken(
            name,
            symbol,
            granularity,
            approvedOperators,
            burnOperator,
            initialSupply,
            { from: adminRole }
          );
        const tokenAddress = await this.AdvancedTokenFactory.advancedTokens(0);
        (await this.AdvancedTokenFactory.verify(tokenAddress)).should.be.true;
    })
  });
});

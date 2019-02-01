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

const BasicTokenFactory = artifacts.require("BasicTokenFactory");

contract("BasicToken", function([_, adminRole]) {
  const name = "ConverseTrackingBitcoin";
  const symbol = "CTB";
  const granularity = new BN(18);
  const burnOperator = adminRole;
  const approvedOperators = [adminRole];
  const initialSupply = new BN(100000000);

  beforeEach(async function() {
    this.basicTokenFactory = await BasicTokenFactory.new(adminRole);
  });
  describe("#makeBasicToken", function() {
    it("reverts if not called by an admin", async function() {
      shouldFail.reverting(
        this.basicTokenFactory.makeBasicToken(
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
      const { logs } = await this.basicTokenFactory.makeBasicToken(
        name,
        symbol,
        granularity,
        approvedOperators,
        burnOperator,
        initialSupply,
        { from: adminRole }
      );
      expectEvent.inLogs(logs, "NewBasicToken", {
        name: name,
        symbol: symbol,
        granularity: granularity,
        initialSupply: initialSupply
      });
    });
  });
  describe("#verify", function() {
    it("should check if a token contract exists", async function() {
        await this.basicTokenFactory.makeBasicToken(
            name,
            symbol,
            granularity,
            approvedOperators,
            burnOperator,
            initialSupply,
            { from: adminRole }
          );
        const tokenAddress = await this.basicTokenFactory.basicTokens(0);
        (await this.basicTokenFactory.verify(tokenAddress)).should.be.true;
    })
  });
});

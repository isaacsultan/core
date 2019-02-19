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

  contract("BasicTokenFactory", function([_, adminRole]) {
    const symbol = toBytes("DAI");
    const tokenAddress = constants.ZERO_ADDRESS;
  
    beforeEach(async function() {
      this.BasicTokenFactory = await BasicTokenFactory.new(adminRole);
    });
    describe("#makeBasicToken", function() {
      it("reverts if not called by an admin", async function() {
        shouldFail.reverting(
          this.BasicTokenFactory.makeBasicToken(
            symbol,
            tokenAddress
          )
        );
      });
      it("adds a new token", async function() {
        const { logs } = await this.BasicTokenFactory.makeBasicToken(
            symbol,
            tokenAddress,
          { from: adminRole }
        );
        expectEvent.inLogs(logs, "NewBasicToken", {
          symbol: symbol,
          tokenAddress: tokenAddress
        });
      });
    });
    describe("#verify", function() {
      it("should check if a token contract exists", async function() {
          await this.BasicTokenFactory.makeBasicToken(
            symbol,
            tokenAddress,
              { from: adminRole }
            );
          (await this.BasicTokenFactory.verify(tokenAddress)).should.be.true;
      })
    });
  });
  
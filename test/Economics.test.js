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

const Economics = artifacts.require("EconomicsImpl");

contract("Economics", function() {
  beforeEach(async function() {
    this.economics = await Economics.new();
  });
  describe("collateralized()", function() {
    it("should return true when liquidation ratio >= collateralization ratio", async function() {
      const lr = new BN(15e17)
      const cb = new BN(1e16)
      const pd = new BN(12e17)

      (await this.economics.collateralized(lr, cb, pd)).should.be.true;
    });
  });
  describe("dynamicDebt()", function() {
    it("should return the new dynamic debt", async function() {
      const debt = await this.economics.dynamicDebt(500, 501, 400, 405, 2);
      const expectedDebt = 2 * ((1 + 2 * (1 - (501 - 500))) / (405 - 400));

      debt.should.be.equal(expectedDebt);
    });
  });
});

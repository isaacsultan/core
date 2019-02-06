const {
  BN,
} = require("openzeppelin-test-helpers");

const { wad, ray, wadToNumber } = require("./fixedPoint");

const Economics = artifacts.require("EconomicsImpl");

contract("Economics", function() {
  beforeEach(async function() {
    this.economics = await Economics.new();
  });
  describe("collateralized()", function() {
    it("should return true when liquidation ratio >= collateralization ratio", async function() {
      const lr = ray(15, 1);
      const cb = wad(200, 0);
      const pd = wad(180, 0);
      (await this.economics.collateralized(lr, cb, pd)).should.be.true;
    });
  });
  describe("dynamicDebt()", function() {
    it("should return the new dynamic debt", async function() {
      const up = wad(500, 0);
      const newUp = wad(450, 0);
      const tp = wad(490, 0);
      const newTp = wad(486, 0);
      const pd = wad(2, 0);
  
      const debt = await this.economics.dynamicDebt(up, newUp, tp, newTp, pd);
      //2.419753086419753086419753086419753086419753086419753086419 ...
      debt.toString().should.be.equal("2419753086419753086");
    });
  });
});

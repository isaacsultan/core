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
  

const Economics = require('Economics');

contract('Economics', function () {
    describe('collateralized()', function () {
        it('should return true when liquidation ratio >= collateralization ratio', async function () {
            (await Economics.collateralized(1.5, 0.1, 1.2)).should.be.true;
        });
    });
    describe('dynamicDebt()', function () {
        it('should return the new dynamic debt', async function () {
            var debt = await Economics.dynamicDebt(500, 501, 400, 405, 2);
            var expectedDebt = 2 * ((1 + 2 * (1 - (501 - 500)))/(405 - 400))

            debt.should.be.equal(expectedDebt);

        });
    });
});
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
  
const BasicTokenFactory = artifacts.require('BasicTokenFactory');
  
contract('BasicToken', function ([_, adminRole]) {
    const name = "MakerDAO_DAI"
    const symbol = "DAI"
    const granularity = 18
    const burnOperator = adminRole
    const approvedOperators = [adminRole]
    const initialSupply = 100 * (10**6)

    beforeEach(async function () {
        this.basicTokenFactory = await BasicTokenFactory.new(adminRole)
    })
    describe('#makeBasicToken', function () {
        it("reverts if not called by an admin", async function () {
            shouldFail.reverting(this.basicTokenFactory.makeBasicToken(name, symbol, granularity, approvedOperators, burnOperator, initialSupply))
        })
        it("adds a new token", async function () {
            const {logs} = await this.basicTokenFactory.makeBasicToken(name, symbol, granularity, approvedOperators, burnOperator, initialSupply, {from: adminRole})
        })
    })
})
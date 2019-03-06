const {
  BN,
  expectEvent,
  shouldFail,
  constants,
  balance,
  send,
  ether,
} = require('openzeppelin-test-helpers');

const toBytes = web3.utils.utf8ToHex;
const { padRight } = web3.utils;
const { wad, rad, ray } = require('./fixedPoint');

const AdvancedTokenFactory = artifacts.require('AdvancedTokenFactory');
const Broker = artifacts.require('Broker');
const ManagingDirector = artifacts.require('ManagingDirector');
const Compliance = artifacts.require('Compliance');
const EthTeller = artifacts.require('EthTeller');
const Erc20TellerFactory = artifacts.require('Erc20TellerFactory');
const Erc20Teller = artifacts.require('Erc20Teller');
const Ticker = artifacts.require('MockTicker');
const ERC20Mock = artifacts.require('ERC20Mock');

// 1 wad = 1000000000000000000

contract('Broker', function([_, adminRole, brokerRole, user, userTwo]) {
  const product = toBytes('CTB');
  const underlying = toBytes('BTC');
  const id = new BN(0);
  const eth = toBytes('ETH');
  const dai = toBytes('DAI');
  let managingDirector;
  let ethTeller;
  let broker;
  let daiTeller;
  let daiToken;
  beforeEach(async function() {
    managingDirector = await ManagingDirector.new(
      toBytes('inverse'),
      adminRole
    );
    const supply = new BN(10).pow(new BN(26)); // 100M in wei
    daiToken = await ERC20Mock.new(user, supply);
    const erc20TellerFactory = await Erc20TellerFactory.new(adminRole);
    await erc20TellerFactory.makeErc20Teller(
      dai,
      daiToken.address,
      managingDirector.address,
      adminRole,
      { from: adminRole }
    );
    daiTeller = await Erc20Teller.at(await erc20TellerFactory.erc20Tellers(0));
    ethTeller = await EthTeller.new(managingDirector.address, adminRole);
    const advancedTokenFactory = await AdvancedTokenFactory.new(adminRole);
    advancedTokenFactory.makeAdvancedToken(
      'Delta',
      'DLT',
      new BN(18),
      [constants.ZERO_ADDRESS],
      constants.ZERO_ADDRESS,
      new BN(100000000),
      { from: adminRole }
    );
    const ticker = await Ticker.new(managingDirector.address);
    const compliance = await Compliance.new(
      managingDirector.address,
      ticker.address,
      adminRole
    );
    broker = await Broker.new(
      managingDirector.address,
      advancedTokenFactory.address,
      compliance.address,
      ethTeller.address,
      erc20TellerFactory.address,
      adminRole
    );
    await managingDirector.addBrokerRole(broker.address, {
      from: adminRole,
    });
    await managingDirector.addBrokerRole(ethTeller.address, {
      from: adminRole,
    });
    await managingDirector.addBrokerRole(daiTeller.address, {
      from: adminRole,
    });

    await compliance.addCollateralType(eth, wad(15, 1), {
      from: adminRole,
    });
    await compliance.addCollateralType(dai, wad(11, 1), {
      from: adminRole,
    });
  });

  describe('approveProduct()', function() {
    it('should allow an admin to approve a new product type', async function() {
      const { logs } = await broker.approveProduct(product, underlying, {
        from: adminRole,
      });
      expectEvent.inLogs(logs, 'NewProductType', {
        productType: padRight(product, 64),
        underlyingType: padRight(underlying, 64),
      });
    });
  });

  describe('agree()', function() {
    it('should revert if an invalid product type is unapproved', async function() {
      shouldFail.reverting(broker.agree(toBytes('DENT'), { from: user }));
    });
    context('a valid product type is approved', function() {
      beforeEach(async function() {
        await broker.approveProduct(product, underlying, {
          from: adminRole,
        });
      });
      it('should emit an event with agreement details', async function() {
        var { logs } = await broker.agree(product, {
          from: user,
        });
        expectEvent.inLogs(logs, 'NewAgreement', {
          client: user,
          id,
          product: padRight(product, 64),
        });
        //
        var { logs } = await broker.agree(product, {
          from: user,
        });
        expectEvent.inLogs(logs, 'NewAgreement', {
          client: user,
          id: new BN(1),
          product: padRight(product, 64),
        });
      });
    });
  });
  describe('transferOwnership()', function() {
    beforeEach(async function() {
      await broker.approveProduct(product, underlying, {
        from: adminRole,
      });
      await broker.agree(product, {
        from: user,
      });
    });
    it('should revert if the user does not own the agreement', async function() {
      shouldFail.reverting(
        broker.transferOwnership(0, user, { from: userTwo })
      );
    });
    it('should emit an event on transfer of ownership', async function() {
      const { logs } = await broker.transferOwnership(0, userTwo, {
        from: user,
      });
      expectEvent.inLogs(logs, 'AgreementTransfer', {
        id: new BN(0),
        from: user,
        to: userTwo,
      });
    });
  });
  describe('offerCollateral()', function() {
    const amount = ether(new BN(1));
    beforeEach(async function() {
      await broker.approveProduct(product, toBytes('BTC'), {
        from: adminRole,
      });
      await broker.agree(product, { from: user });
    });
    it('should require a valid collateral type', async function() {
      await shouldFail.reverting(
        broker.offerCollateral(id, toBytes('DENT'), amount, { from: user })
      );
    });
    it('should require a valid agreementID', async function() {
      const invalidId = new BN(5);
      await shouldFail.reverting(
        broker.offerCollateral(invalidId, eth, amount, { from: user })
      );
    });
    context('ETH tokens are offered as collateral', function() {
      it('should deposit tokens in EthTeller', async function() {
        (await balance.difference(ethTeller.address, async () => {
          await broker.offerCollateral(id, eth, amount, {
            from: user,
            value: amount,
          });
        })).should.be.bignumber.equal(amount);
      });
      it('should increase agreement collateral', async function() {
        await broker.offerCollateral(id, eth, amount, {
          from: user,
          value: amount,
        });
        (await managingDirector.agreementCollateral(
          id,
          eth
        )).should.be.bignumber.equal(amount);
      });
      it('should emit an event', async function() {
        const { logs } = await broker.offerCollateral(id, eth, amount, {
          from: user,
          value: amount,
        });
        expectEvent.inLogs(logs, 'CollateralOffer', {
          client: user,
          id,
          collateral: padRight(eth, 64),
          amount,
        });
      });
    });
    context('ERC20 tokens are offered as collateral', function() {
      beforeEach(async function() {
        await daiToken.approve(daiTeller.address, amount, { from: user });
      });
      it('should transfer tokens to erc20Teller', async function() {
        await broker.offerCollateral(id, dai, amount, {
          from: user,
        });
        (await daiToken.balanceOf(daiTeller.address)).should.be.bignumber.equal(
          amount
        );
      });
      it('should increase agreement collateral', async function() {
        await broker.offerCollateral(id, dai, amount, {
          from: user,
        });
        (await managingDirector.agreementCollateral(
          id,
          dai
        )).should.be.bignumber.equal(amount);
      });
      it('should emit an event', async function() {
        const { logs } = await broker.offerCollateral(id, dai, amount, {
          from: user,
        });
        expectEvent.inLogs(logs, 'CollateralOffer', {
          client: user,
          id,
          collateral: padRight(dai, 64),
          amount,
        });
      });

    it('should revert if agreement already fully collateralized', async function() {
      await broker.offerCollateral(id, eth, new BN(90), {
        from: user,
        value: amount,
      });
      shouldFail.reverting(
        broker.offerCollateral(id, dai, new BN(1), {
          from: user,
          value: amount,
        })
      );
    });
  });

  describe('withdrawCollateral()', function() {
    const amount = wad(1, 0);
    const smallerAmount = wad(5, 1);
    beforeEach(async function() {
      await broker.approveProduct(product, underlying, {
        from: adminRole,
      });
      await broker.agree(product, { from: user });
    });
    it('should revert if uncollateralised', async function() {
      await shouldFail.reverting(
        broker.withdrawCollateral(id, eth, new BN(1), { from: user })
      );
    });
    it('should revert if withdrawing from agreement not owned by the user', async function() {
      await broker.offerCollateral(id, eth, amount, {
        from: user,
        value: amount,
      });
      await shouldFail.reverting(broker.withdrawCollateral(id, eth, amount), {
        from: userTwo,
      });
    });
    context('collateral type is ETH', function() {
      beforeEach(async function() {
        await broker.offerCollateral(id, eth, amount, {
          from: user,
          value: amount,
        });
      });
      it('should withdraw from EthTeller', async function() {
        const expectedAmount = new wad(-5, 1);
        (await balance.difference(ethTeller.address, async () => {
          await broker.withdrawCollateral(id, eth, smallerAmount, {
            from: user,
          });
        })).should.be.bignumber.equal(expectedAmount);
      });
      it('should add tokens to the user', async function() {
        const initialAmount = await balance.current(user);

        await broker.withdrawCollateral(id, eth, smallerAmount, {
          from: user,
        });

        const expectedAmount = initialAmount.add(smallerAmount);
        (await balance.current(user)).should.be.bignumber.equal(expectedAmount);
      });
      it('should decrease agreement collateral', async function() {
        await broker.withdrawCollateral(id, eth, smallerAmount, {
          from: user,
        });
        (await managingDirector.agreementCollateral(
          id,
          eth
        )).should.be.bignumber.equal(smallerAmount);
      });
      it('should revert if there is not enough collateral to withdraw', async function() {
        const largerAmount = wad(2, 0);
        shouldFail.reverting(
          broker.withdrawCollateral(id, eth, largerAmount, {
            from: user,
          })
        );
      });
      it('should emit an event', async function() {
        const { logs } = await broker.withdrawCollateral(
          id,
          eth,
          smallerAmount,
          {
            from: user,
          }
        );
        expectEvent.inLogs(logs, 'CollateralWithdraw', {
          client: user,
          id,
          collateral: padRight(eth, 64),
          amount: smallerAmount,
        });
      });
    context('collateral type is ERC20', function() {
      beforeEach(async function() {
        await daiToken.approve(daiTeller.address, amount, { from: user });
        await broker.offerCollateral(id, dai, amount, {
          from: user,
        });
      });
      it('should withdraw from Erc20Teller', async function() {
        const initialAmount = await daiToken.balanceOf(daiTeller.address);
        await broker.withdrawCollateral(id, dai, smallerAmount, {
          from: user,
        });
        const expectedAmount = initialAmount.sub(smallerAmount);
        (await daiToken.balanceOf(daiTeller.address)).should.be.bignumber.equal(
          expectedAmount
        );
      });
      it('should add tokens to the user', async function() {
        const initialAmount = await daiToken.balanceOf(user);

        await broker.withdrawCollateral(id, dai, smallerAmount, {
          from: user,
        });

        const expectedAmount = initialAmount.add(smallerAmount);
        (await daiToken.balanceOf(user)).should.be.bignumber.equal(
          expectedAmount
        );
      });
      it('should decrease agreement collateral', async function() {
        await broker.withdrawCollateral(id, dai, smallerAmount, {
          from: user,
        });
        (await managingDirector.agreementCollateral(
          id,
          dai
        )).should.be.bignumber.equal(smallerAmount);
      });
      it('should revert if there is not enough collateral to withdraw', async function() {
        const largerAmount = wad(2, 0);
        shouldFail.reverting(
          broker.withdrawCollateral(id, dai, largerAmount, {
            from: user,
          })
        );
      });
      it('should emit an event', async function() {
        const { logs } = await broker.withdrawCollateral(
          id,
          dai,
          smallerAmount,
          {
            from: user,
          }
        );
        expectEvent.inLogs(logs, 'CollateralWithdraw', {
          client: user,
          id,
          collateral: padRight(dai, 64),
          amount: smallerAmount,
        });
      });
    });
  });
});

const {
  BN,
  expectEvent,
  shouldFail,
  time,
  balance,
} = require('openzeppelin-test-helpers');
const setup = require('./productTellerSetup');

const toBytes = web3.utils.utf8ToHex;
const { padRight } = web3.utils;
const { wad, ray } = require('./fixedPoint');

const ProductTeller = artifacts.require('ProductTeller');
const AdvancedToken = artifacts.require('ERC777');

contract('ProductTeller', function([
  _,
  adminRole,
  brokerRole,
  user,
  mockProductTeller,
]) {
  const productType = toBytes('CTB');
  const productFee = wad(2, 2);
  const id = new BN(0);
  const amount = wad(2, 0);
  const smallerAmount = new BN(1);
  const eth = toBytes('ETH');
  let productTellerFactory;
  let productTeller;
  let managingDirector;
  let broker;
  let productAddress;
  let deltaAddress;
  let ticker;
  let liquidator;
  let compliance;
  let delta;
  let product;
  let advancedTokenFactory;
  let ethTeller;
  beforeEach(async function() {
    [
      productTellerFactory,
      managingDirector,
      broker,
      productAddress,
      deltaAddress,
      ticker,
      liquidator,
      compliance,
      advancedTokenFactory,
      ethTeller,
    ] = await setup(adminRole, brokerRole);

    productTeller = await ProductTeller.new(
      productType,
      managingDirector.address,
      broker.address,
      productAddress,
      deltaAddress,
      ticker.address,
      liquidator.address,
      compliance.address,
      adminRole
    );
    delta = await AdvancedToken.at(deltaAddress);
    product = await AdvancedToken.at(productAddress);

    await delta.approve(user, amount, { from: adminRole });
    await delta.transferFrom(adminRole, user, amount, { from: user });

    await product.approve(user, amount, { from: adminRole });
    await product.transferFrom(adminRole, user, amount, { from: user });

    await managingDirector.addBrokerRole(broker.address, { from: adminRole });
    await managingDirector.addBrokerRole(ethTeller.address, {
      from: adminRole,
    });
    await compliance.addCollateralType(eth, wad(15, 1), { from: adminRole });
  });

  describe('setProductFee', function() {
    it('should allow an admin to set a product fee', async function() {
      await productTeller.setProductFee(productFee, { from: adminRole });
      (await productTeller.productFee()).should.be.bignumber.equal(productFee);
    });
    it('should emit an event', async function() {
      const { logs } = await productTeller.setProductFee(productFee, {
        from: adminRole,
      });
      expectEvent.inLogs(logs, 'ProductFee', {
        productType: padRight(productType, 64),
        fee: productFee,
      });
    });
  });
  describe('withdraw()', function() {
    const collateralAmount = new BN(10);
    beforeEach(async function() {
      await broker.approveProduct(productType, toBytes('BTC'), {
        from: adminRole,
      });
      await broker.agree(productType, { from: user });
      productTeller.setProductFee(productFee, { from: adminRole });
      await delta.approve(productTeller.address, new BN(70), { from: user }); // NB: remove when migrating to ERC777
    });
    it('should revert when ProductTeller does not have broker role', async function() {
      await broker.offerCollateral(id, eth, collateralAmount, {
        from: user,
        value: collateralAmount,
      });
      shouldFail.reverting.withMessage(
        productTeller.withdraw(id, smallerAmount, { from: user }),
        'DOES_NOT_HAVE_BROKER_ROLE'
      );
    });
    context('ProductTeller has broker role', function() {
      beforeEach(async function() {
        await managingDirector.addBrokerRole(productTeller.address, {
          from: adminRole,
        });
      });
      it('should revert when there is already a debt', async function() {
        await broker.offerCollateral(id, eth, amount, {
          from: user,
          value: amount,
        });

        await productTeller.withdraw(id, smallerAmount, { from: user });
        await shouldFail.reverting.withMessage(
          productTeller.withdraw(id, smallerAmount, { from: user }),
          'Product already minted'
        );
      });
      it('should revert if agreement has no collateral', async function() {
        await shouldFail.reverting.withMessage(
          productTeller.withdraw(id, smallerAmount, { from: user }),
          'Agreement is uncollateralized'
        );
      });
      // it('should revert if agreement has insufficient collateral', async function() { TODO: Fix compliance
      //  const collateralAmount = new BN(1);
      //  const largerAmount = new BN(10000000000000000);
      //  await broker.offerCollateral(id, eth, collateralAmount, {
      //    from: user,
      //    value: collateralAmount,
      //  });
      //  await shouldFail.reverting.withMessage(
      //    productTeller.withdraw(id, largerAmount, { from: user }),
      //    'Agreement has insufficient collateral'
      //  );
      // });
      it('should take a product fee', async function() {
        await broker.offerCollateral(id, eth, collateralAmount, {
          from: user,
          value: collateralAmount,
        });
        const expectedAmount = (await delta.balanceOf(user))
          .sub(smallerAmount)
          .sub(new BN(69));
        await productTeller.withdraw(id, smallerAmount, { from: user });
        (await delta.balanceOf(user)).should.be.bignumber.equal(expectedAmount);
      });
      it('should give client product tokens', async function() {
        await broker.offerCollateral(id, eth, collateralAmount, {
          from: user,
          value: collateralAmount,
        });
        const initialAmount = await product.balanceOf(user);
        await productTeller.withdraw(id, smallerAmount, { from: user });
        (await product.balanceOf(user)).should.be.bignumber.equal(
          initialAmount.add(smallerAmount)
        );
      });
      it('should emit an event', async function() {
        await broker.offerCollateral(id, eth, collateralAmount, {
          from: user,
          value: collateralAmount,
        });
        const { logs } = await productTeller.withdraw(id, smallerAmount, {
          from: user,
        });

        expectEvent.inLogs(logs, 'ProductWithdraw', {
          productType: padRight(productType, 64),
          client: user,
          agreementId: id,
          amount: smallerAmount,
          feePaid: new BN(70),
        });
      });
    });
  });

  describe('pay()', function() {
    const fullAmount = new BN(2);
    const partialAmount = new BN(1);
    beforeEach(async function() {
      await managingDirector.addBrokerRole(mockProductTeller, {
        from: adminRole,
      });
      await broker.approveProduct(productType, toBytes('BTC'), {
        from: adminRole,
      });
      await managingDirector.originateAgreement(user, productType, {
        from: mockProductTeller,
      });
      productTeller.setProductFee(productFee, { from: adminRole });
      await managingDirector.increaseClientCollateralBalance(
        user,
        eth,
        new BN(10),
        { from: mockProductTeller }
      );
      await managingDirector.increaseAgreementCollateral(id, eth, new BN(10), {
        from: mockProductTeller,
      });
      await managingDirector.mintAgreementProduct(
        id,
        fullAmount,
        wad(20, 0),
        wad(3500, 0),
        { from: mockProductTeller }
      );
    });
    it('should revert when ProductTeller does not have broker role', async function() {
      product.approve(productTeller.address, partialAmount, { from: user }); // TODO: remove when ERC777
      shouldFail.reverting.withMessage(
        productTeller.pay(id, partialAmount, { from: user }),
        'DOES_NOT_HAVE_BROKER_ROLE'
      );
    });
    context('ProductTeller has broker role', function() {
      beforeEach(async function() {
        await managingDirector.addBrokerRole(productTeller.address, {
          from: adminRole,
        });
        product.approve(productTeller.address, fullAmount, { from: user }); // TODO: remove when ERC777
      });
      it('should burn product tokens', async function() {
        const initialAmount = await product.balanceOf(user);
        await productTeller.pay(id, fullAmount, { from: user });
        (await product.balanceOf(user)).should.be.bignumber.equal(
          initialAmount.sub(fullAmount)
        );
      });
      context('when the debt is partially paid', function() {
        it('should reset liquidation time', async function() {
          await time.advanceBlock();
          const latestTime = await time.latest();
          await productTeller.pay(id, partialAmount, { from: user });
          (await liquidator.liquidationTimes(id)).should.equal(latestTime);
        });
        it('should modify the agreement', async function() {
          const initialProductDebt = (await managingDirector.agreements(id))
            .productDebt;
          await productTeller.pay(id, partialAmount, { from: user });
          const agreement = await managingDirector.agreements(id);
          agreement.productDebt.should.be.bignumber.equal(
            initialProductDebt.sub(partialAmount)
          );
        });
      });
      context('when the debt is fully paid', function() {
        it('should liquidate the agreement');
      });
      it('should emit an event', async function() {
        const { logs } = await productTeller.pay(id, fullAmount, {
          from: user,
        });
        expectEvent.inLogs(logs, 'ProductPay', {
          productType: padRight(productType, 64),
          client: user,
          agreementId: id,
          amount: fullAmount,
        });
      });
    });
  });
});

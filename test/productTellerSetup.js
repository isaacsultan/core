const { BN } = require("openzeppelin-test-helpers");

const Liquidator = artifacts.require("Liquidator");
const BasicTokenFactory = artifacts.require("BasicTokenFactory");
const Broker = artifacts.require("Broker");
const ManagingDirector = artifacts.require("ManagingDirector");
const Compliance = artifacts.require("Compliance");
const Ticker = artifacts.require("MockTicker");
const ProductTellerFactory = artifacts.require("ProductTellerFactory");
const Erc20TellerFactory = artifacts.require("Erc20TellerFactory");
const EthTeller = artifacts.require("EthTeller");

const toBytes = web3.utils.utf8ToHex;

async function setup(adminRole, brokerRole) {
  const granularity = new BN(18);
  const burnOperator = adminRole;
  const approvedOperators = [adminRole];
  const initialSupply = new BN(100000000);

  const productTellerFactory = await ProductTellerFactory.new(adminRole);

  const managingDirector = await ManagingDirector.new(
    toBytes("inverse"),
    adminRole,
    brokerRole
  );
  const liquidator = await Liquidator.new(managingDirector.address);
  const ticker = await Ticker.new(managingDirector.address);
  const compliance = await Compliance.new(
    managingDirector.address,
    ticker.address
  );
  const erc20TellerFactory = await Erc20TellerFactory.new(adminRole);
  const ethTeller = await EthTeller.new(managingDirector.address, adminRole);
  const basicTokenFactory = await BasicTokenFactory.new(adminRole);
  const broker = await Broker.new(
    managingDirector.address,
    basicTokenFactory.address,
    compliance.address,
    ethTeller.address,
    erc20TellerFactory.address,
    adminRole
  );

  await basicTokenFactory.makeBasicToken(
    "PF-Delta",
    "DLT",
    granularity,
    approvedOperators,
    burnOperator,
    initialSupply,
    { from: adminRole }
  );
  await basicTokenFactory.makeBasicToken(
    "PF-ConverseTrackingBitcoin",
    "CTB",
    granularity,
    approvedOperators,
    burnOperator,
    initialSupply,
    { from: adminRole }
  );

  const productToken = await basicTokenFactory.basicTokens(1);
  const deltaToken = await basicTokenFactory.basicTokens(0);

  return [
    productTellerFactory,
    managingDirector,
    broker,
    productToken,
    deltaToken,
    ticker,
    liquidator,
    compliance
  ];
}

module.exports = setup;

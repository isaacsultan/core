const { BN, constants } = require("openzeppelin-test-helpers");
const { wad, ray } = require("./fixedPoint");

const Liquidator = artifacts.require("Liquidator");
const AdvancedTokenFactory = artifacts.require("AdvancedTokenFactory");
const Broker = artifacts.require("Broker");
const ManagingDirector = artifacts.require("ManagingDirector");
const Compliance = artifacts.require("Compliance");
const Ticker = artifacts.require("MockTicker");
const ProductTellerFactory = artifacts.require("ProductTellerFactory");
const Erc20TellerFactory = artifacts.require("Erc20TellerFactory");
const EthTeller = artifacts.require("EthTeller");
const AdvancedToken = artifacts.require("ERC777");

const toBytes = web3.utils.utf8ToHex;

async function setup(adminRole, brokerRole) {
  const granularity = new BN(18);
  const burnOperator = adminRole;
  const approvedOperators = [adminRole];
  const initialSupply = new wad(100000, 0);

  const productTellerFactory = await ProductTellerFactory.new(adminRole);

  const managingDirector = await ManagingDirector.new(
    toBytes("inverse"),
    adminRole
  );
  const liquidator = await Liquidator.new(managingDirector.address, constants.ZERO_ADDRESS); //TODO: Add real address
  const ticker = await Ticker.new(managingDirector.address);
  const compliance = await Compliance.new(
    managingDirector.address,
    ticker.address,
    adminRole
  );
  const erc20TellerFactory = await Erc20TellerFactory.new(adminRole);
  const ethTeller = await EthTeller.new(managingDirector.address, adminRole);
  const advancedTokenFactory = await AdvancedTokenFactory.new(adminRole);
  const broker = await Broker.new(
    managingDirector.address,
    advancedTokenFactory.address,
    compliance.address,
    ethTeller.address,
    erc20TellerFactory.address,
    adminRole
  );

  const productToken = await AdvancedToken.new(
    "PF-Delta",
    "DLT",
    granularity,
    approvedOperators,
    burnOperator,
    initialSupply,
    toBytes(""),
    toBytes(""),
    { from: adminRole }
  );
  const deltaToken = await AdvancedToken.new(
    "PF-Delta",
    "DLT",
    granularity,
    approvedOperators,
    burnOperator,
    initialSupply,
    toBytes(""),
    toBytes(""),
    { from: adminRole }
  );

  const productTokenAddress = productToken.address;
  const deltaTokenAddress = deltaToken.address;

  return [
    productTellerFactory,
    managingDirector,
    broker,
    productTokenAddress,
    deltaTokenAddress,
    ticker,
    liquidator,
    compliance,
    advancedTokenFactory,
    ethTeller
  ];
}

module.exports = setup;

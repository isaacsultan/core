var Ticker = artifacts.require('Ticker');
var BasicTokenFactory = artifacts.require('BasicTokenFactory');
var ManagingDirector = artifacts.require('ManagingDirector');
var Liquidator = artifacts.require('Liquidator');
var Broker = artifacts.require('Broker');
var Economics = artifacts.require('Economics');
var Math = artifacts.require('Math');
var Roles = artifacts.require('Roles');
var ERC20TellerFactory = artifacts.require('ERC20TellerFactory');
var ETHTeller = artifacts.require('ETHTeller');
var LinkToken = artifacts.require("LinkToken");
var Oracle = artifacts.require("Oracle");
var ProductTellerFactory = artifacts.require("ProductTellerFactory")


var adminRole = '' //TODO
var brokerRole = '' //TODO
var daiAddress = '' //TODO
var productFee = '' //TODO
var liquidityRatio, liquidityFee //TODO

module.exports = async function(deployer) {

  await deployer.deploy(ManagingDirector, 'inverse', adminRole, brokerRole);

  await deployer.deploy(ERC20TellerFactory, [adminRole]);
  await deployer.deploy(ETHTeller, [adminRole]);

  await deployer.deploy(BasicTokenFactory, [adminRole])

  await deployer.deploy(LinkToken);
  await deployer.deploy(Oracle, [LinkToken.address]);
  await deployer.deploy(Ticker, [ManagingDirector.address]);
  
  await deployer.deploy(Compliance, [ManagingDirector.address, Ticker.address]);

  await deployer.deploy(Broker, [ManagingDirector.address, ProductTellerFactory.address, Compliance.address, adminRole, ETHTeller.address, ERC20TellerFactory.address]) //TODO

  //TODO: deploy Liquidator

  await deployer.deploy(ProductTellerFactory, [adminRole]);

  await deployer.deploy(Math);
  await deployer.link(Math, [ManagingDirector, ETHTeller, Broker]);

  await deployer.deploy(Roles);
  await deployer.link(Math, [ManagingDirector, ETHTeller, Broker]);

  await deployer.deploy(Economics);
  await deployer.link(Economics, [Broker]);
}

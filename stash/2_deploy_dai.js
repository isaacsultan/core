const ERC20Mock = artifacts.require("ERC20Mock");
//const daiAddress = "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359";

module.exports = async function(deployer, network, accounts) {
    if (network === "development") {
        console.log("Deploying MockDAI on Development at: ", accounts[5]);
        await deployer.deploy(ERC20Mock, accounts[5], 100*(10**6), {from: accounts[5]});
    }
}
pragma solidity 0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";

import {ManagingDirector} from "../contracts/ManagingDirector.sol";
import {Broker} from "../contracts/Broker.sol";
//import {ProductTeller} from "../contracts/ProductTeller.sol";
import {DSMath} from "../contracts/Math.sol";
import {BasicToken} from "../contracts/BasicToken.sol";
import {Ticker} from "../contracts/Ticker.sol";


contract TestBroker {

    ManagingDirector managingDirector;
    Broker broker;
    Ticker ticker;
    BasicToken delta;
    //ProductTeller productTeller;

    event Break1();
    event Break2();
    event Break3();

    function ray(uint integer, uint offset) internal pure returns (uint) {
        return integer * 10 ** (27 - offset);
    }

    function wad (uint integer, uint offset) internal pure returns (uint) {
        return integer * 10 ** (18 - offset);
    }

    function iwad (int integer, uint offset) internal pure returns (int) {
        return mul(10 ** (18 - offset), integer);
    }

    function mul(uint x, int y) internal pure returns (int z) {
      assembly {
        z := mul(x, y)
        if slt(x, 0) { revert(0, 0) }
        if iszero(eq(y, 0)) { if iszero(eq(sdiv(z, y), x)) { revert(0, 0) } }
      }
    }

    uint256 constant ONE = 10 ** 27;


    function setUp() public {

        managingDirector = ManagingDirector(DeployedAddresses.ManagingDirector());
        ticker = Ticker(DeployedAddresses.Ticker());
        delta = BasicToken(DeployedAddresses.BasicToken());
        broker = new Broker(managingDirector, ticker, delta);


        // managingDirector = new ManagingDirector();
        // ticker = new Ticker();
        // address[] memory defaultOperators = new address[](1);
        // defaultOperators[0] = this;
        // delta = new BasicToken(
        //     "delta",
        //     "DLT",
        //     18, 
        //     defaultOperators,
        //     this,
        //     100**6
        //     );
        // broker = new Broker(managingDirector, ticker, delta);
    }

    function test_agree() public {
        uint agreementId = broker.agree("CTB");
        (bytes32 productType, , , ) = managingDirector.agreements(0);
        Assert.equal(productType, bytes32("CTB"), "agreement is to mint CTB");
    }

    // function test_manageCDD() public {

    //     uint agreementId = broker.agree("CTB");
    //     broker.offerCollateral(agreementId, "ETH", wad(2, 0));




    //     (uint lr, uint tcb, uint tpd) = managingDirector.collateralTypes("ETH");

    //     Assert(lr, ray(14, 1));
    //     Assert(tcb, wad(1001, 0));
    //     Assert(tpd, wad(501, 0));

    //     (uint cb, uint pd, uint ir) = managingDirector.cdds("ETH", bytes32(msg.sender));

    //     Assert(cb, wad(1, 0));
    //     Assert(pd, wad(1, 0)); //fails!
    //     Assert(ir, ray(2, 2));

    //     //test negative changes
    //     //assert
    // }

}
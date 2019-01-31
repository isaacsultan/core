"use strict";

require("./chainlink-helper.js");

contract("Ticker", () => {
  let Link = artifacts.require("MockLinkToken");
  let Oracle = artifacts.require("MockOracle");
  let Ticker = artifacts.require("Ticker");
  let jobId = "4c7b7ffb66b344fbaa64995af81e355a";
  let market = "USD";
  let link, oc, cc, newOc;

  beforeEach(async () => {
    link = await Link.new();
    oc = await Oracle.new(link.address, {from: oracleNode});
    newOc = await Oracle.new(link.address, {from: oracleNode});
    cc = await Ticker.new({from: consumer}); //TODO
  });

  describe("#updateLinkToken", () => {
    context("when called by a non-owner", () => {
      it("does not set", async () => {
        await assertActionThrows(async () => {
          await cc.updateLinkToken(link.address, {from: stranger});
        });
      });
    });

    context("when called by the owner", () => {
      it("sets the LinkToken address", async () => {
        await cc.updateLinkToken(link.address, {from: consumer});
        assert.equal(await cc.getChainlinkToken.call(), link.address);
      });
    });
  });

  describe("#updateOracle", () => {
    context("when called by a non-owner", () => {
      it("does not set", async () => {
        await assertActionThrows(async () => {
          await cc.updateOracle(oc.address, {from: stranger});
        });
      });
    });

    context("when called by the owner", () => {
      it("sets the oracle address", async () => {
        await cc.updateOracle(oc.address, {from: consumer});
        assert.equal(await cc.getOracle.call(), oc.address);
      });
    });
  });

  describe("#requestEthereumPrice", () => {
    context("without setting LinkToken or Oracle addresses", () => {
      it("reverts", async () => {
        await assertActionThrows(async () => {
          await cc.requestEthereumPrice(jobId, market, {from: consumer});
        });
      });
    });

    context("with setting LinkToken and Oracle addresses", () => {
      beforeEach(async () => {
        await cc.updateLinkToken(link.address, {from: consumer});
        await cc.updateOracle(oc.address, {from: consumer});
      });

      context("without LINK", () => {
        it("reverts", async () => {
          await assertActionThrows(async () => {
            await cc.requestEthereumPrice(jobId, market, {from: consumer});
          });
        });
      });

      context("with LINK", () => {
        beforeEach(async () => {
          await link.transfer(cc.address, web3.toWei("1", "ether"));
        });

        it("triggers a log event in the Oracle contract", async () => {
          let tx = await cc.requestEthereumPrice(jobId, market, {from: consumer});
          let log = tx.receipt.logs[3];
          assert.equal(log.address, oc.address);

          let [jId, requester, wei, id, ver, cborData] = decodeRunRequest(log);
          let params = await cbor.decodeFirst(cborData);
          let expected = {
            "path":"USD",
            "times": 100,
            "url":"https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,JPY"
          };
          
          assert.isAbove(id.toNumber(), 0);
          assert.equal(cc.address.slice(2), requester.slice(26));
          assert.equal(`0x${toHex(rPad(jobId))}`, jId);
          assert.equal(web3.toWei("1", "ether"), hexToInt(wei));
          assert.equal(1, ver);
          assert.deepEqual(expected, params);
        });

        it("has a reasonable gas cost", async () => {
          let tx = await cc.requestEthereumPrice(jobId, market, {from: consumer});
          assert.isBelow(tx.receipt.gasUsed, 210000);
        });

        context("after updating the oracle contract address", () => {
          it("triggers a log event in the new Oracle contract", async () => {
            await cc.updateOracle(newOc.address, {from: consumer});
            assert.equal(await cc.getOracle.call(), newOc.address);
            let tx = await cc.requestEthereumPrice(jobId, market, {from: consumer});
            let log = tx.receipt.logs[3];
            assert.equal(log.address, newOc.address);

            let [jId, requester, wei, id, ver, cborData] = decodeRunRequest(log);
            let params = await cbor.decodeFirst(cborData);
            let expected = {
              "path":"USD",
              "times": 100,
              "url":"https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,JPY"
            };
            
            assert.isAbove(id.toNumber(), 0);
            assert.equal(cc.address.slice(2), requester.slice(26));
            assert.equal(`0x${toHex(rPad(jobId))}`, jId);
            assert.equal(web3.toWei("1", "ether"), hexToInt(wei));
            assert.equal(1, ver);
            assert.deepEqual(expected, params);
          });
        });
      });
    });
  });

  describe("#fulfillData", () => {
    let expected = 50000;
    let response = "0x" + encodeUint256(expected);
    let internalId;

    beforeEach(async () => {
      await link.transfer(cc.address, web3.toWei("1", "ether"));
      await cc.updateLinkToken(link.address, {from: consumer});
      await cc.updateOracle(oc.address, {from: consumer});
      await cc.requestEthereumPrice(jobId, market, {from: consumer});
      let event = await getLatestEvent(oc);
      internalId = event.args.internalId;
    });

    it("records the data given to it by the oracle", async () => {
      await oc.fulfillData(internalId, response, {from: oracleNode});
      let currentPrice = await cc.currentPrice.call();
      assert.equal(currentPrice.toNumber(), expected);
    });

    it("logs the data given to it by the oracle", async () => {
      let tx = await oc.fulfillData(internalId, response, {from: oracleNode});
      assert.equal(2, tx.receipt.logs.length);
      let log = tx.receipt.logs[1];
      assert.equal(log.topics[2], response);
    });

    context("when my contract does not recognize the request ID", () => {
      let otherId;

      beforeEach(async () => {
        let funcSig = functionSelector("fulfill(bytes32,bytes32)");
        let args = requestDataBytes(jobId, cc.address, funcSig, 42, "");
        await requestDataFrom(oc, link, 0, args);
        let event = await getLatestEvent(oc);
        otherId = event.args.internalId;
      });

      it("does not accept the data provided", async () => {
        await oc.fulfillData(otherId, response, {from: oracleNode});
        let currentPrice = await cc.currentPrice.call();
        assert.equal(currentPrice.toNumber(), 0);
      });
    });

    context("when called by anyone other than the oracle contract", () => {
      it("does not accept the data provided", async () => {
        await assertActionThrows(async () => {
          await cc.fulfill("1", response, {from: stranger});
        });

        let currentPrice = await cc.currentPrice.call();
        assert.equal(currentPrice.toNumber(), 0);
      });
    });
  });

  describe("#cancelRequest", () => {
    let requestId;

    beforeEach(async () => {
      await link.transfer(cc.address, web3.toWei("1", "ether"));
      await cc.updateLinkToken(link.address, {from: consumer});
      await cc.updateOracle(oc.address, {from: consumer});
      requestId = await cc.requestEthereumPrice.call(jobId, market, {from: consumer});
    });

    context("when called by a non-owner", () => {
      it("cannot cancel a request", async () => {
        await increaseTime5Minutes();
        await assertActionThrows(async () => {
          await cc.cancelRequest(requestId, {from: stranger});
        });
      });
    });
  });

  describe("#withdrawLink", () => {
    beforeEach(async () => {
      await link.transfer(cc.address, web3.toWei("1", "ether"));
      await cc.updateLinkToken(link.address, {from: consumer});
    });

    context("when called by a non-owner", () => {
      it("cannot withdraw", async () => {
        await assertActionThrows(async () => {
          await cc.withdrawLink({from: stranger});
        });
      });
    });

    context("when called by the owner", () => {
      it("transfers LINK to the owner", async () => {
        const beforeBalance = await link.balanceOf(consumer);
        assert.equal(beforeBalance.toString(), "0");
        await cc.withdrawLink({from: consumer});
        const afterBalance = await link.balanceOf(consumer);
        assert.equal(afterBalance.toString(), web3.toWei("1", "ether"));
      });
    });
  });
});
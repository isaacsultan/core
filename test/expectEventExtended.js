const { BN, expect, should } = require('openzeppelin-test-helpers/src/setup.js');


function inLogs(logs, eventName, eventArgs = {}, toString = false) {
    const event = logs.find(function (e) {
      if (e.event === eventName) {
        for (const [k, v] of Object.entries(eventArgs)) {
          contains(e.args, k, v, toString);
        }
        return true;
      }
    });
    should.exist(event);
    return event;
  }

  function contains (args, key, value, toString = false) {
    (key in args).should.equal(true, `Unknown event argument '${key}'`);
  
    if (value === null) {
      expect(args[key]).to.equal(null);
    } else if (isBN(args[key]) && !toString) {
      expect(args[key]).to.be.bignumber.equal(value);
    } else if (isBN(args[key]) && toString) {
      expect(args[key].toString()).to.be.equal(value);
    } else {
      expect(args[key]).to.be.equal(value);
    }
  }
  
  function isBN (object) {
    return BN.isBN(object) || object instanceof BN;
  }

  const expectEvent = { inLogs }

  module.exports = {
    expectEvent: expectEvent
  };
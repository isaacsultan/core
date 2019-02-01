const { BN } = require("openzeppelin-test-helpers");

function ray(number, precision) {
  const n = new BN(number);
  const e = 27 - precision;
  return n.mul(new BN(10).pow(new BN(e)));
}

function wad(number, precision) {
  const n = new BN(number);
  const e = 18 - precision;
  return n.mul(new BN(10).pow(new BN(e)));
}

module.exports = { ray: ray, wad: wad };

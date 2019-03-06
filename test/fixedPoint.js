/*

## Units

- `wad`: fixed point decimal with 18 decimals (for basic quantities, e.g. balances)
- `ray`: fixed point decimal with 27 decimals (for precise quantites, e.g. ratios)
- `rad`: fixed point decimal with 45 decimals (result of integer multiplication with a `wad` and a `ray`)

The base of `ray` is `ONE = 10 ** 27`.

## Multiplication

Generally, `wad` should be used additively and `ray` should be used
multiplicatively. It usually doesn't make sense to multiply a `wad` by a
`wad` (or a `rad` by a `rad`).

- `mul`: standard integer multiplcation. No loss of precision.
- `rmul`: used for multiplications involving `ray`'s. Precision is lost.

They can only be used sensibly with the following combination of units:

- `mul(wad, ray) -> rad`
- `rmul(wad, ray) -> wad`
- `rmul(ray, ray) -> ray`
- `rmul(rad, ray) -> rad`

*/

const { BN } = web3.utils;

function wad(number, decimals) {
  const exponent = 18 - decimals;
  const multiplicand = new BN(10).pow(new BN(exponent));
  return new BN(number).mul(multiplicand);
}

function ray(wadType) {
  return new BN(wadType).mul(new BN(10).pow(new BN(9)));
}

function rad(wadType) {
  return new BN(wadType).mul(new BN(10).pow(new BN(27)));
}

module.exports = { wad, rad, ray };

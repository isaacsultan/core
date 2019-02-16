# core

[![CircleCI](https://circleci.com/gh/partial-f/core.svg?style=svg)](https://circleci.com/gh/partial-f/core)

Smart contracts for [Partial f](https://partialf.com/), a decentralized protocol that allows the printing of synthetic derivative tokens.

## Development

### Install

```
npm install
```

### Compile

```
npm run compile
```

### Test

```
ganache-cli
npm test
```

## Contributing

Partial f's source code is licensed under the [Apache 2.0 License](https://github.com/partial-f/core/blob/master/LICENSE), and contributions are welcome.

Thank you!

## Architecture

### Contracts

#### Base Protocol

##### BasicToken.sol

Allows the creation ERC-777 tokens that represent product tokens (e.g. CTB). 

##### Broker.sol

Allows a client to create and manage an agreement. 

##### CollateralTeller.sol

Allows ERC-20 & ETH tokens to be deposited and withdrawn as agreement collateral.

##### Liquidator.sol

Allows collateral to be sold in the event of liquidation.

##### ManagingDirector.sol

Allows a single source of truth for the Partial f system.

##### ProductTeller.sol

Allows product tokens to be deposited and withdrawn from an agreement.

#### Libraries & Helpers

##### Math.sol

Contains the DSMath package includes functions that allow fixed-point mathematics.

##### Economics.sol

Contains the formulae for the dynamic debt rule. 

##### Compliance.sol

Contains a helper method that calculates the agreement collateral value & liquidation ratio.




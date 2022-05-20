# Ether Core

[![npm](https://img.shields.io/npm/v/@jovijovi/ether-core.svg)](https://www.npmjs.com/package/@jovijovi/ether-core)
[![GitHub Actions](https://github.com/jovijovi/ether-core/workflows/Test/badge.svg)](https://github.com/jovijovi/ether-core)
[![Coverage](https://img.shields.io/codecov/c/github/jovijovi/ether-core?label=\&logo=codecov\&logoColor=fff)](https://codecov.io/gh/jovijovi/ether-core)

Out-of-the-box core APIs for Ethereum ecosystem.

## Philosophy

*:kiss: KISS. Keep it small and simple.*

## Features

- Out-of-the-box APIs

## Development Environment

- typescript `4.6.4`
- node `v16.15.0`
- ts-node `v10.7.0`
- yarn `v1.22.18`

## Install

```shell
npm install @jovijovi/ether-core
```

or

```shell
yarn add @jovijovi/ether-core
```

## Usage

```typescript
import {core} from '@jovijovi/ether-core';

const walletInfo = await core.NewWallet();
const wallet = core.GetWallet(walletInfo.pk);
const receipt = await core.Transfer(YOUR_WALLET_ADDRESS, wallet.address, '1', wallet.privateKey);
if (receipt.status != core.params.StatusSuccessful) {
	log.RequestId().error("Transfer failed, error=%o", receipt);
	return;
}
```

## Roadmap

- Documents

## License

[MIT](LICENSE)

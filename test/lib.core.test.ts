import yaml from 'yaml';
import {core} from '../lib';
import {network} from '@jovijovi/ether-network';
import assert from 'assert';
import {
	GetBalanceOf,
	GetTxReceipt,
	GetTxResponse,
	NewJsonWallet,
	NewWallet,
	Observer,
	VerifyAddress
} from '../lib/core';

const configYaml = `
custom:
  tx:
    # GasLimit coefficient (%)
    # Example: 110 means gasLimit * 110%
    gasLimitC: 110
    # Transfer confirmations
    confirmations: 3

  # Default network
  defaultNetwork:
    # Chain name
    chain: polygon
    # Network name
    network: mainnet
    # Use provider pool
    providerPool: true

  networks:
    # Polygon
    # Ref: https://docs.polygon.technology/docs/develop/network-details/network
    polygon:
      mainnet:
        chainId: 137
        provider:
          - https://polygon-rpc.com
          - https://rpc-mainnet.maticvigil.com
        browser: https://polygonscan.com
`

const mockZeroAddress = '0x0000000000000000000000000000000000000000';
const mockTxHash = '0x3031380da82bc89de4b585359682da277413a7baf1b021b20d43f7e7d3921130';
const mockBlockHash = '0x58ff39832eb91833d9ead7215d1c87e1f4f7c2441d967135526eabbe61473b35';
const mockMsg = 'The answer to life, the universe, and everything';
const mockTransferAmount = '1';

class YmlConfig {
	custom: any;
}

let setting: YmlConfig;

beforeAll(async () => {
	setting = yaml.parse(configYaml);
})

test('Test Connection', async () => {
	network.LoadConfig(setting.custom);
	const result = await network.isConnected();
	console.debug("Connected=", result);
	assert.strictEqual(result, true);
}, 10000)

test('GetGasPrice', async () => {
	const gasPrice = await core.GetGasPrice();
	console.debug("GasPrice=", gasPrice);
}, 10000)

test('GetTxReceipt', async () => {
	const receipt = await core.GetTxReceipt(mockTxHash);
	console.debug("Receipt=%o", receipt);
	assert.strictEqual(receipt.status, 1);
}, 20000)

test('GetTxResponse', async () => {
	const txRsp = await core.GetTxResponse(mockTxHash);
	console.debug("TxRsp=%o", txRsp);
	assert.strictEqual(txRsp.hash, mockTxHash);
}, 20000)

test('GetBlock', async () => {
	const block = await core.GetBlock(mockBlockHash);
	console.debug("Block=%o", block);
	assert.strictEqual(block.hash, mockBlockHash);
}, 10000)

test('GetBlockNumber', async () => {
	const blockNumber = await core.GetBlockNumber();
	console.debug("BlockNumber=", blockNumber);
	assert.strictEqual(blockNumber > 0, true);
}, 10000)

test('GetBalanceOf', async () => {
	const result = await core.GetBalanceOf(mockZeroAddress);
	console.debug("BalanceOf(%s)=%o", mockZeroAddress, result);
	assert.strictEqual(Number(result.balance) > 0, true);
}, 10000)

test('Observer', async () => {
	const result = await core.Observer(mockZeroAddress);
	console.debug("Observer(%s) Balance=%o", mockZeroAddress, result);
	assert.strictEqual(Number(result.balance) > 0, true);
}, 10000)

test('NewWallet', async () => {
	const walletInfo = await core.NewWallet();
	console.debug("New Wallet info=%o", walletInfo);
	assert.strictEqual(walletInfo.address.length > 0, true);
}, 10000)

test('NewJsonWallet', async () => {
	const jsonWallet = await core.NewJsonWallet("Hello");
	console.debug("New JSON wallet=%s", jsonWallet);
	assert.strictEqual(jsonWallet.length > 0, true);
}, 10000)

test('InspectJsonWallet', async () => {
	const jsonWallet = await core.NewJsonWallet("Hello");
	console.debug("New JSON wallet=%s", jsonWallet);
	assert.strictEqual(jsonWallet.length > 0, true);

	const walletInfo = await core.InspectJsonWallet("Hello", jsonWallet);
	console.debug("InspectJsonWallet=%o", walletInfo);
	assert.strictEqual(walletInfo.address.length > 0, true);

	const jsonWallet1 = await core.RetrieveJsonWalletFromMnemonic("Hello", walletInfo.mnemonic);
	console.debug("Retrieved JSON wallet1=%s", jsonWallet1);
	assert.strictEqual(jsonWallet1.length > 0, true);

	const jsonWallet2 = await core.RetrieveJsonWalletFromPK("Hello", walletInfo.pk);
	console.debug("Retrieved JSON wallet2=%s", jsonWallet2);
	assert.strictEqual(jsonWallet2.length > 0, true);

	const wallet1 = await core.InspectJsonWallet("Hello", jsonWallet1);
	console.debug("Wallet1=%s", wallet1.address);
	const wallet2 = await core.InspectJsonWallet("Hello", jsonWallet2);
	console.debug("Wallet2=%s", wallet2.address);
	assert.strictEqual(wallet1.address, wallet2.address);
}, 40000)

test('VerifyAddress', async () => {
	const walletInfo = await core.NewWallet();
	const isValid = core.VerifyAddress(walletInfo.address);
	console.debug("VerifyAddress(%s)=%o", walletInfo.address, isValid);
	assert.strictEqual(isValid, true);
})

test('GetWallet', async () => {
	const walletInfo = await core.NewWallet();
	const wallet = core.GetWallet(walletInfo.pk);
	console.debug("GetWallet=%s", wallet.address);
	assert.strictEqual(wallet.address, walletInfo.address);
}, 10000)

test('SignMessage', async () => {
	const walletInfo = await core.NewWallet();
	const sig1 = await core.SignMessage(walletInfo.pk, mockMsg);
	const sig2 = await core.SignMessage(walletInfo.pk, mockMsg);
	const sig3 = await core.SignMessage(walletInfo.pk, mockMsg);

	console.debug("Msg=%s\nAddress=%s\nSig1=%s\nSig2=%s\nSig3=%s", mockMsg, walletInfo.address, sig1, sig2, sig3);

	assert.strictEqual(sig1, sig2);
	assert.strictEqual(sig1, sig3);
})

test('VerifySig', async () => {
	const walletInfo = await core.NewWallet();
	const wallet = core.GetWallet(walletInfo.pk);
	const sig = await wallet.signMessage(mockMsg);
	const isValid = await core.VerifySig(wallet.address, mockMsg, sig);
	console.debug("Msg=%s\nAddress=%s\nSig=%s", mockMsg, wallet.address, sig);
	console.debug("VerifySig=", isValid);
	assert.strictEqual(isValid, true);
}, 10000)

test('Transfer', async () => {
	const walletInfo = await core.NewWallet();
	const wallet = core.GetWallet(walletInfo.pk);
	try {
		await core.Transfer(wallet.address, mockZeroAddress, mockTransferAmount, wallet.privateKey);
	} catch (e) {
		console.debug(e)
	}
}, 40000)

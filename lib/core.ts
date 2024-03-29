import {randomFillSync} from 'crypto';
import {BigNumber, utils, Wallet} from 'ethers';
import {Block, TransactionReceipt, TransactionResponse} from '@ethersproject/abstract-provider';
import {Bytes} from '@ethersproject/bytes';
import {auditor, log} from '@jovijovi/pedrojs-common';
import {network} from '@jovijovi/ether-network';
import {GasLimitC, MaxEntropyLength, StatusSuccessful, TransferConfirmations} from './params';

// GetWallet returns wallet
export function GetWallet(pk: string): Wallet {
	if (!pk) {
		throw new Error('invalid pk');
	}
	return new Wallet(pk, network.MyProvider.Get());
}

// GetConfirmations returns tx confirmations
export function GetConfirmations(confirmations = TransferConfirmations): number {
	return confirmations;
}

// GetGasPrice returns gas price (Wei)
export async function GetGasPrice(): Promise<any> {
	const provider = network.MyProvider.Get();
	const price = await provider.getGasPrice();
	const blockNumber = await provider.getBlockNumber();
	log.RequestId().debug("BlockNumber=%s, Price=%o", blockNumber.toString(), price.toString());
	return {
		blockNumber: blockNumber,
		price: price.toString(),
	}
}

// GetReceipt returns transaction receipt
export async function GetTxReceipt(txHash: string): Promise<TransactionReceipt> {
	const provider = network.MyProvider.Get();
	const receipt = await provider.getTransactionReceipt(txHash);
	log.RequestId().trace("txHash=%s, receipt=%o", txHash, receipt);
	return receipt;
}

// GetTxResponse returns transaction response by txHash
export async function GetTxResponse(txHash: string): Promise<TransactionResponse> {
	const provider = network.MyProvider.Get();
	return await provider.getTransaction(txHash);
}

// GetBlock returns block by blockHash
export async function GetBlock(blockHash: string): Promise<Block> {
	const provider = network.MyProvider.Get();
	return await provider.getBlock(blockHash);
}

// GetBlockNumber returns block number
export async function GetBlockNumber(): Promise<number> {
	const provider = network.MyProvider.Get();
	const blockNumber = await provider.getBlockNumber();
	log.RequestId().debug("Current BlockNumber=", blockNumber);
	return blockNumber;
}

// GetBalanceOf returns balance of address
export async function GetBalanceOf(address: string, blockHash?: string): Promise<any> {
	auditor.Check(utils.isAddress(address), 'invalid address');
	const provider = network.MyProvider.Get();
	const blockNumber = blockHash ? (await provider.getBlock(blockHash)).number : await provider.getBlockNumber();
	const balance = blockHash ? await provider.getBalance(address, blockHash) : await provider.getBalance(address);
	log.RequestId().debug("BalanceOf(%s)=%s, blockNumber=%d", address, balance.toString(), blockNumber);
	return {
		blockNumber: blockNumber,
		balance: balance.toString(),
	};
}

// Observer returns balance of address (Unit: Ether)
export async function Observer(address: string): Promise<any> {
	auditor.Check(utils.isAddress(address), 'invalid address');
	const provider = network.MyProvider.Get();
	const blockNumber = await provider.getBlockNumber();
	const balance = await provider.getBalance(address);
	return {
		blockNumber: blockNumber,
		balance: utils.formatEther(balance),    // Unit: Ether
	};
}

// Estimate gas of transfer
export async function EstimateGasOfTransfer(from: string, to: string, amount: string): Promise<BigNumber> {
	auditor.Check(utils.isAddress(from), 'invalid from address');
	auditor.Check(utils.isAddress(to), 'invalid to address');
	auditor.Check(utils.parseEther(amount) > BigNumber.from(0), 'invalid amount');

	const provider = network.MyProvider.Get();
	const tx = {
		from: utils.getAddress(from),
		to: utils.getAddress(to),
		value: utils.parseUnits(amount, 'wei'),
		nonce: await provider.getTransactionCount(from, 'latest'),
	};

	return await provider.estimateGas(tx);
}

// Transfer
export async function Transfer(from: string, to: string, amount: string, pk: string, gasLimitC = GasLimitC, confirmations?: number): Promise<TransactionReceipt> {
	auditor.Check(utils.isAddress(from), 'invalid from address');
	auditor.Check(utils.isAddress(to), 'invalid to address');
	auditor.Check(utils.parseEther(amount) > BigNumber.from(0), 'invalid amount');
	auditor.Check(!!pk, 'invalid pk');

	const provider = network.MyProvider.Get();
	const feeWallet = new Wallet(pk);
	const signer = feeWallet.connect(provider);
	const gasPrice = await provider.getGasPrice();
	const nonce = await provider.getTransactionCount(from, 'latest');
	const tx = {
		from: utils.getAddress(from),
		to: utils.getAddress(to),
		value: utils.parseUnits(amount, 'wei'),
		nonce: nonce,
		gasLimit: '',
		gasPrice: gasPrice,
	};
	const gasLimit = await provider.estimateGas(tx);
	// finalGasLimit = gasLimit * gasLimitC / 100
	const finalGasLimit = gasLimit.mul(BigNumber.from(gasLimitC)).div(100);
	tx.gasLimit = utils.hexlify(finalGasLimit);

	// Send tx
	const txRsp = await signer.sendTransaction(tx);

	// Wait tx
	const receipt = await provider.waitForTransaction(txRsp.hash, GetConfirmations(confirmations));

	// Check tx status
	if (receipt.status !== StatusSuccessful) {
		log.RequestId().error("Transfer failed, error=%o", receipt);
		return;
	}

	log.RequestId().info("Transfer completed. TxHash=%s, From=%s, To=%s, GasPrice=%d, GasLimit=%d, GasUsed=%d",
		txRsp.hash, tx.from, tx.to, tx.gasPrice, tx.gasLimit, receipt.gasUsed);

	return receipt;
}

// Sign message
export async function SignMessage(pk: string, msg: Bytes | string): Promise<string> {
	return await GetWallet(pk).signMessage(msg);
}

// Verify signature
export async function VerifySig(address: string, msg: string, sig: string): Promise<boolean> {
	auditor.Check(utils.isAddress(address), 'invalid address');
	auditor.Check(msg.length > 0, 'invalid message');
	auditor.Check(utils.isBytesLike(sig), 'invalid signature');
	const verifiedAddress = utils.verifyMessage(msg, sig);
	return verifiedAddress.toLowerCase() === address.toLowerCase();
}

// Create new wallet address (Externally Owned Account)
export async function NewWallet(entropy?: string): Promise<any> {
	if (entropy) {
		auditor.Check(entropy.length <= MaxEntropyLength, "invalid entropy, max length is " + MaxEntropyLength);
	}

	const wallet = Wallet.createRandom({
		extraEntropy: entropy ? utils.toUtf8Bytes(entropy) : randomFillSync(new Uint8Array(MaxEntropyLength)),
	});

	log.RequestId().debug("New wallet address=", wallet.address);

	return {
		chain: network.GetDefaultNetwork().chain,
		network: network.GetDefaultNetwork().network,
		address: wallet.address,
		pk: wallet.privateKey,
		mnemonic: wallet.mnemonic.phrase,
	};
}

// Create new JSON wallet
export async function NewJsonWallet(password: string, entropy?: string): Promise<string> {
	auditor.Check(password, "invalid password");
	if (entropy) {
		auditor.OnlyValid(entropy).Check(entropy.length <= MaxEntropyLength, "invalid entropy, max length is " + MaxEntropyLength);
	}

	const wallet = Wallet.createRandom({
		extraEntropy: entropy ? utils.toUtf8Bytes(entropy) : randomFillSync(new Uint8Array(MaxEntropyLength)),
	});

	log.RequestId().debug("New JSON wallet address=", wallet.address);

	return await wallet.encrypt(password);
}

// Retrieve JSON wallet from mnemonic
export async function RetrieveJsonWalletFromMnemonic(password: string, mnemonic: string): Promise<string> {
	auditor.Check(password, "invalid password");
	auditor.Check(mnemonic, "invalid mnemonic");
	const wallet = Wallet.fromMnemonic(mnemonic);
	log.RequestId().debug("Retrieve JSON wallet from mnemonic, address=", wallet.address);
	return await wallet.encrypt(password);
}

// Retrieve JSON wallet from PK
export async function RetrieveJsonWalletFromPK(password: string, pk: string): Promise<string> {
	auditor.Check(password, "invalid password");
	auditor.Check(pk, "invalid pk");
	const wallet = new Wallet(pk);
	log.RequestId().debug("Retrieve JSON wallet from PK, address=", wallet.address);
	return await wallet.encrypt(password);
}

// Inspect JSON wallet
export async function InspectJsonWallet(password: string, jsonWallet: string): Promise<any> {
	auditor.Check(password, "invalid password");
	auditor.Check(jsonWallet, "invalid pk");
	const wallet = await Wallet.fromEncryptedJson(jsonWallet, password);

	log.RequestId().debug("InspectJsonWallet address=", wallet.address);

	return {
		chain: network.GetDefaultNetwork().chain,
		network: network.GetDefaultNetwork().network,
		address: wallet.address,
		pk: wallet.privateKey,
		mnemonic: wallet.mnemonic ? wallet.mnemonic.phrase : undefined,
	};
}

// Verify address
export const VerifyAddress = utils.isAddress;

// Export
export * as params from './params';
export * from './proxy';

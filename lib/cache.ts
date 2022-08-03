import {cache} from '@jovijovi/pedrojs-common';

export namespace Cache {
	const cacheSet = cache.New();

	// CacheProxyContractAddress cache of proxy contract address
	// default ttl is 24 hour
	export const CacheProxyContractAddress = cacheSet.New("proxyContractAddress", {
		max: 1000,
		ttl: 1000 * 60 * 60 * 24,
	});
}

import { useQuery } from '@tanstack/react-query';
import { MAINNET, useProviderForChain } from '@snx-v3/useBlockchain';
import { Contract } from 'ethers';
import { formatBytes32String } from 'ethers/lib/utils';
import { wei } from '@synthetixio/wei';

export function useRates() {
  const mainnetProvider = useProviderForChain(MAINNET);

  return useQuery({
    queryKey: ['rates-mainnet'],
    enabled: Boolean(mainnetProvider),
    queryFn: async function () {
      if (!mainnetProvider) {
        throw 'Mainnet provider missing';
      }
      const { address, abi } = await import(
        '@synthetixio/contracts/build/mainnet/deployment/ExchangeRates'
      );
      const ExchangeRates = new Contract(address, abi, mainnetProvider);

      const result = await ExchangeRates.ratesForCurrencies([
        formatBytes32String('SNX'),
        formatBytes32String('ETH'),
      ]);
      return {
        snx: wei(result[0] || 0),
        eth: wei(result[1] || 0),
      };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

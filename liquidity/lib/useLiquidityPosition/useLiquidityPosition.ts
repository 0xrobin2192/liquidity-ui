import { contractsHash } from '@snx-v3/tsHelpers';
import { AccountCollateralType, loadAccountCollateral } from '@snx-v3/useAccountCollateral';
import { useNetwork, useProviderForChain } from '@snx-v3/useBlockchain';
import { loadPrices } from '@snx-v3/useCollateralPrices';
import { useCollateralTypes } from '@snx-v3/useCollateralTypes';
import { useCoreProxy } from '@snx-v3/useCoreProxy';
import { useSystemToken } from '@snx-v3/useSystemToken';
import { erc7412Call } from '@snx-v3/withERC7412';
import { ZodBigNumber } from '@snx-v3/zod';
import Wei, { wei } from '@synthetixio/wei';
import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { z } from 'zod';

const PositionCollateralSchema = z.object({
  value: ZodBigNumber.transform((x) => wei(x)).optional(),
  amount: ZodBigNumber.transform((x) => wei(x)),
});

const DebtSchema = ZodBigNumber.transform((x) => wei(x));

export const loadPosition = async ({
  CoreProxyContract,
  accountId,
  poolId,
  tokenAddress,
}: {
  CoreProxyContract: ethers.Contract;
  accountId: string;
  poolId: string;
  tokenAddress: string;
}) => {
  const calls = await Promise.all([
    CoreProxyContract.populateTransaction.getPositionCollateral(accountId, poolId, tokenAddress),
    CoreProxyContract.populateTransaction.getPositionDebt(accountId, poolId, tokenAddress),
  ]);

  const decoder = (multicallEncoded: string | string[]) => {
    if (Array.isArray(multicallEncoded) && multicallEncoded.length === 2) {
      const decodedCollateral = CoreProxyContract.interface.decodeFunctionResult(
        'getPositionCollateral',
        multicallEncoded[0]
      );
      const decodedDebt = CoreProxyContract.interface.decodeFunctionResult(
        'getPositionDebt',
        multicallEncoded[1]
      )[0];
      return {
        debt: DebtSchema.parse(decodedDebt),
        collateral: PositionCollateralSchema.parse({ ...decodedCollateral }),
      };
    }
    throw Error('Expected array with two items');
  };

  return { calls, decoder };
};

export type LiquidityPosition = {
  collateralAmount: Wei;
  collateralPrice: Wei;
  collateralValue: Wei;
  debt: Wei;
  accountCollateral: AccountCollateralType;
  usdCollateral: AccountCollateralType;
  tokenAddress: string;
  accountId: string;
};

export const useLiquidityPosition = ({
  tokenAddress,
  accountId,
  poolId,
}: {
  tokenAddress?: string;
  accountId?: string;
  poolId?: string;
}) => {
  const { data: CoreProxy } = useCoreProxy();
  const { data: systemToken } = useSystemToken();
  const { network } = useNetwork();
  const provider = useProviderForChain(network);
  const { data: collateralTypes } = useCollateralTypes(true);

  return useQuery({
    queryKey: [
      `${network?.id}-${network?.preset}`,
      'LiquidityPosition',
      { accountId },
      {
        pool: poolId,
        token: tokenAddress,
      },
      { contractsHash: contractsHash([CoreProxy, systemToken]) },
    ],
    enabled: Boolean(
      CoreProxy && accountId && poolId && tokenAddress && systemToken && network && provider
    ),
    queryFn: async () => {
      if (
        !(CoreProxy && accountId && poolId && tokenAddress && systemToken && network && provider)
      ) {
        throw Error('useLiquidityPosition not ready');
      }
      const CoreProxyContract = new ethers.Contract(CoreProxy.address, CoreProxy.abi, provider);
      const { calls: priceCalls, decoder: priceDecoder } = await loadPrices({
        collateralAddresses: [tokenAddress],
        CoreProxyContract,
      });

      const { calls: positionCalls, decoder: positionDecoder } = await loadPosition({
        CoreProxyContract,
        accountId,
        poolId,
        tokenAddress,
      });

      const { calls: accountCollateralCalls, decoder: accountCollateralDecoder } =
        await loadAccountCollateral({
          accountId,
          tokenAddresses: [tokenAddress, systemToken.address],
          provider,
          CoreProxy,
        });

      const allCalls = priceCalls.concat(positionCalls).concat(accountCollateralCalls);

      return await erc7412Call(
        network,
        provider,
        allCalls,
        (encoded) => {
          if (!Array.isArray(encoded)) throw Error('Expected array');

          const startOfPrice = 0;
          const endOfPrice = priceCalls.length;
          const startOfPosition = endOfPrice;
          const endOfPosition = startOfPosition + positionCalls.length;

          const startOfAccountCollateral = endOfPosition;
          const collateralPrice = priceDecoder(encoded.slice(startOfPrice, endOfPrice));
          const decodedPosition = positionDecoder(encoded.slice(startOfPosition, endOfPosition));
          const [accountCollateral, usdCollateral] = accountCollateralDecoder(
            encoded.slice(startOfAccountCollateral)
          );

          const collateralType = collateralTypes?.find(
            (x) => x.tokenAddress.toLowerCase() === accountCollateral.tokenAddress.toLowerCase()
          );
          if (collateralType) {
            accountCollateral.symbol = collateralType.symbol;
            accountCollateral.displaySymbol = collateralType.displaySymbol;
            accountCollateral.decimals = collateralType.decimals;
          }

          return {
            collateralPrice: Array.isArray(collateralPrice) ? collateralPrice[0] : collateralPrice,
            collateralAmount: decodedPosition.collateral.amount,
            collateralValue: decodedPosition.collateral.amount.mul(collateralPrice),
            debt: decodedPosition.debt,
            tokenAddress,
            accountCollateral,
            usdCollateral,
            accountId,
          };
        },
        `useLiquidityPosition`
      );
    },
  });
};

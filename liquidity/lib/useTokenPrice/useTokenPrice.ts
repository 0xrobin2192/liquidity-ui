import { useOfflinePrices } from '@snx-v3/useCollateralPriceUpdates';
import { useCollateralTypes } from '@snx-v3/useCollateralTypes';
import { useMemo } from 'react';
import { ZEROWEI } from '@snx-v3/constants';
import { wei } from '@synthetixio/wei';
import { useOraclePrice } from '@snx-v3/useOraclePrice';

export const useTokenPrice = (symbol?: string) => {
  const { data: collateralTypes } = useCollateralTypes(true);

  const pythCollateralPrices = collateralTypes?.filter((item) => item.symbol !== 'stataUSDC');
  const omCollateralPrices = collateralTypes?.filter((item) => item.symbol === 'stataUSDC');

  const { data: collateralPrices } = useOfflinePrices(
    (pythCollateralPrices || []).map((item) => ({
      id: item.tokenAddress,
      oracleId: item.oracleNodeId,
      symbol: item.symbol,
    }))
  );

  const { data: omPrices } = useOraclePrice(omCollateralPrices?.[0]?.oracleNodeId);

  return useMemo(() => {
    if (!collateralTypes || !collateralPrices) {
      return ZEROWEI;
    }

    const collateralPrice = [
      ...collateralPrices,
      ...(omPrices ? [{ symbol: 'stataUSDC', price: omPrices.price }] : []),
    ].find((price) => `${price?.symbol}`.toUpperCase() === `${symbol}`.toUpperCase());

    return collateralPrice && collateralPrice.price ? wei(collateralPrice.price) : ZEROWEI;
  }, [collateralPrices, collateralTypes, symbol, omPrices]);
};

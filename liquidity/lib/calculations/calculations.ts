import type { MarketSnapshotByWeekSchema, PoolType } from '@snx-v3/usePoolData';
import { z } from 'zod';
import { wei, Wei } from '@synthetixio/wei';
import { ZEROWEI } from '@snx-v3/constants';

type MarketSnapshotByWeek = z.infer<typeof MarketSnapshotByWeekSchema>;

export const calculateSevenDaysPnlGrowth = (marketSnapshots?: MarketSnapshotByWeek[]) => {
  if (!marketSnapshots || marketSnapshots.length === 0) return undefined;
  const end = marketSnapshots[0].pnl;
  const start = marketSnapshots[1]?.pnl || wei(0);

  return {
    value: end.sub(start),
    percentage: start.eq(0) ? undefined : end.sub(start).div(start.abs()),
  };
};

export const calculatePoolPerformanceLifetime = (poolData?: PoolType) => {
  return poolData?.configurations.reduce((acc, { market }) => {
    return acc.add(market.pnl);
  }, wei(0));
};

export const calculatePoolPerformanceSevenDays = (poolData?: PoolType) => {
  const total = calculatePoolPerformanceLifetime(poolData);

  const totalSevenDaysAgo = poolData?.configurations.reduce((acc, { market }) => {
    return acc.add(market.market_snapshots_by_week[1]?.pnl || wei(0));
  }, wei(0));

  if (!total || !totalSevenDaysAgo) {
    return undefined;
  }

  return {
    value: total.sub(totalSevenDaysAgo), // Not that this value does not take into account that other pools might have exposure to markets
    growthPercentage: totalSevenDaysAgo.eq(0)
      ? undefined
      : total.sub(totalSevenDaysAgo).div(totalSevenDaysAgo.abs()),
  };
};

export function calculateCRatio(debt?: Wei, collateralValue?: Wei) {
  if (debt && collateralValue && !debt.eq(0) && !collateralValue.eq(0)) {
    return collateralValue.div(debt);
  }
  return ZEROWEI;
}

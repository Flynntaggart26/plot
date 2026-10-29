import { useQuery } from '@tanstack/react-query';
import { getStatsSummary, type RangeDays } from './service';

export const statsKeys = {
  all: ['stats'] as const,
  range: (days: RangeDays) => ['stats', 'range', days] as const,
};

export function useStats(rangeDays: RangeDays = 7) {
  return useQuery({
    queryKey: statsKeys.range(rangeDays),
    queryFn: () => getStatsSummary(rangeDays),
  });
}

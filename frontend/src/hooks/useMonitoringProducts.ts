import { useQuery } from '@tanstack/react-query'

import { fetchMonitoringRows } from '@/api/monitoring'

export function useMonitoringProducts() {
  return useQuery({
    queryKey: ['monitoring', 'products'],
    queryFn: fetchMonitoringRows,
  })
}

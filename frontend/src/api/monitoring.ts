import type { MonitoringRow } from '@/api/types'

/** Sample catalog rows (shared by monitoring + advanced tools). */
export const MONITORING_SAMPLE_PRODUCTS: MonitoringRow[] = [
  {
    id: '1',
    name: 'Thermal mug 500ml',
    imageUrl: 'https://picsum.photos/seed/wb1/96/96',
    currentPrice: 890,
    competitorPrice: 720,
    gapFraction: (890 - 720) / 720,
    status: 'high_risk',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Wireless earbuds',
    imageUrl: 'https://picsum.photos/seed/wb2/96/96',
    currentPrice: 2490,
    competitorPrice: 2550,
    gapFraction: (2490 - 2550) / 2550,
    status: 'optimal',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Desk lamp LED',
    imageUrl: 'https://picsum.photos/seed/wb3/96/96',
    currentPrice: 1590,
    competitorPrice: 1490,
    gapFraction: (1590 - 1490) / 1490,
    status: 'high_risk',
    updatedAt: new Date().toISOString(),
  },
]

export async function fetchMonitoringRows(): Promise<MonitoringRow[]> {
  await new Promise((r) => setTimeout(r, 450))
  return structuredClone(MONITORING_SAMPLE_PRODUCTS)
}

/** FPL stores prices in tenths of a million (e.g. 152 = £15.2m). */
export const formatPrice = (nowCost: number): string => `£${(nowCost / 10).toFixed(1)}m`;
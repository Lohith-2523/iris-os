import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  AreaChart: ({ responsive, style, children }: React.PropsWithChildren<{ responsive?: boolean; style?: React.CSSProperties }>) => (
    <div data-testid="area-chart" data-responsive={String(responsive)} style={style}>{children}</div>
  ),
  Area: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

import { RevenueLineChart } from './revenue-line-chart';

describe('RevenueLineChart', () => {
  it('uses the chart-native responsive sizing inside a measured frame', () => {
    render(<RevenueLineChart data={[{ label: 'Jan', revenue: 1200 }]} />);

    const chart = screen.getByTestId('area-chart');
    expect(chart).toHaveAttribute('data-responsive', 'true');
    expect(chart).toHaveStyle({ width: '100%', height: '100%', minHeight: '256px' });
    expect(chart.parentElement).toHaveClass('revenue-line-chart-frame', 'min-w-0');
  });
});

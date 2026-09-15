import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  AreaChart: ({ responsive, style, children }: React.PropsWithChildren<{ responsive?: boolean; style?: React.CSSProperties }>) => (
    <svg data-testid="area-chart" data-responsive={String(responsive)} style={style}>{children}</svg>
  ),
  Area: ({ dataKey }: { dataKey: string }) => <g data-testid={`series-${dataKey}`} />,
  CartesianGrid: () => null,
  Legend: ({ content }: { content?: (() => React.ReactNode) | React.ReactNode }) => (
    <>{typeof content === 'function' ? content() : content}</>
  ),
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

  it('allows multiple financial series to be selected from the legend', () => {
    render(<RevenueLineChart selectableSeries data={[{ label: 'Jan', revenue: 1200, expenses: 400, receivables: 250 }]} />);

    expect(screen.getByTestId('series-revenue')).toBeInTheDocument();
    expect(screen.getByTestId('series-expenses')).toBeInTheDocument();
    expect(screen.getByTestId('series-receivables')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expenses' }));
    expect(screen.queryByTestId('series-expenses')).not.toBeInTheDocument();
    expect(screen.getByTestId('series-revenue')).toBeInTheDocument();
    expect(screen.getByTestId('series-receivables')).toBeInTheDocument();
  });

  it('uses the chart legend itself as the series selector', () => {
    render(<RevenueLineChart selectableSeries data={[{ label: 'Jan', revenue: 1200, expenses: 400, receivables: 250 }]} />);

    const selector = screen.getByRole('group', { name: 'Financial graph metrics' });
    expect(selector).toHaveClass('revenue-series-legend');
    expect(screen.getByRole('button', { name: 'Revenue' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps one series visible when the last active legend item is pressed', () => {
    render(<RevenueLineChart selectableSeries data={[{ label: 'Jan', revenue: 1200, expenses: 400, receivables: 250 }]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Expenses' }));
    fireEvent.click(screen.getByRole('button', { name: 'Receivables' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revenue' }));

    expect(screen.getByTestId('series-revenue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revenue' })).toHaveAttribute('aria-pressed', 'true');
  });
});

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  PieChart: ({ children }: React.PropsWithChildren) => <svg>{children}</svg>,
  Pie: ({ children }: React.PropsWithChildren) => <g>{children}</g>,
  Cell: ({ fill }: { fill: string }) => <path data-testid="pie-segment" fill={fill} />,
  Tooltip: () => null,
}));

import { SalesPipelinePieChart } from './sales-pipeline-pie-chart';

describe('SalesPipelinePieChart', () => {
  it('renders configured stage colors and numeric distribution', () => {
    render(<SalesPipelinePieChart stages={[
      { id: 'procured', label: 'Procured', color: '#123456', count: 3 },
      { id: 'closed', label: 'Closed', color: '#ABCDEF', count: 1 },
    ]} />);

    expect(screen.getByRole('img')).toHaveAttribute('aria-label', '4 total leads split across 2 pipeline stages');
    expect(screen.getAllByTestId('pie-segment').map((segment) => segment.getAttribute('fill'))).toEqual(['#123456', '#ABCDEF']);
    expect(screen.getByText('Procured')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});

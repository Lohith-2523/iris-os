import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ pathname: '/dashboard' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

import { RouteThemeSync } from './route-theme-sync';

describe('RouteThemeSync', () => {
  beforeEach(() => {
    document.cookie = 'crystal_theme=light; Path=/';
    document.documentElement.className = 'light';
  });

  it.each(['/login', '/signup'])('forces dark theme on %s', (pathname) => {
    navigation.pathname = pathname;
    render(<RouteThemeSync />);

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).not.toHaveClass('light');
  });

  it('continues to honor the persisted theme inside the workspace', () => {
    navigation.pathname = '/dashboard';
    document.documentElement.className = 'dark';
    render(<RouteThemeSync />);

    expect(document.documentElement).toHaveClass('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

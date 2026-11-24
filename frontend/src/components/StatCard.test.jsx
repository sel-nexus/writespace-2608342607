/** Verify zero/positive statistic presentation and functional accent variants. */
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { StatCard } from './StatCard';

it.each([0, 42])('renders %s with an explicit counting subtitle', (value) => {
  render(<StatCard label="Total Users" value={value} subtitle="Including built-in admin" />);
  const region = screen.getByRole('region', { name: 'Total Users' });
  expect(region).toHaveTextContent(String(value));
  expect(region).toHaveTextContent('Including built-in admin');
  expect(region.querySelector('p')).toHaveClass('tabular-nums');
});
it.each(['indigo', 'violet', 'pink', 'teal'])('uses %s border without coloring the full surface', (color) => {
  render(<StatCard label="Count" value={0} subtitle="Empty" color={color} />);
  expect(screen.getByRole('region')).toHaveClass(`border-${color}-500`, 'bg-white');
});

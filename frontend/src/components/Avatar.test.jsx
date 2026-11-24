/** Check the specified static role representations and unknown-author fallback. */
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Avatar, getAvatar } from './Avatar';

it.each([['admin', '👑', 'bg-violet-600'], ['user', '📚', 'bg-indigo-500'], ['unknown', '📚', 'bg-indigo-500']])(
  'renders %s with the required emoji and role color', (role, emoji, color) => {
    render(<Avatar role={role} />);
    expect(screen.getByRole('img')).toHaveTextContent(emoji);
    expect(screen.getByRole('img')).toHaveClass(color);
  },
);
it('exports styled JSX directly for unknown authors', () => {
  render(getAvatar());
  expect(screen.getByRole('img', { name: 'user avatar' })).toHaveTextContent('📚');
});

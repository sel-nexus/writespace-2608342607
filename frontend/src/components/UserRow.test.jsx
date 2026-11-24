/** Verify semantic row/card details and protected deletion explanations. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { UserRow } from './UserRow';

const account = {
  id: '11111111-1111-4111-8111-111111111111', displayName: 'Reader', username: 'reader', role: 'user',
  createdAt: '2026-03-04T12:00:00.000Z', password: 'never-render',
};
/** Mount the component in its valid semantic container. */
function setup(props = {}) {
  const onDelete = vi.fn();
  const row = <UserRow account={account} onDelete={onDelete} {...props} />;
  render(props.mobile ? row : (
    <table>
      <tbody>{row}</tbody>
    </table>
  ));
  return onDelete;
}
it.each([false, true])('renders eligible details and delete callback mobile=%s', async (mobile) => {
  const callback = setup({ mobile });
  expect(screen.getByText('Reader')).toBeInTheDocument();
  expect(screen.getByText('reader')).toBeInTheDocument();
  expect(screen.getByText('Mar 04, 2026')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'user avatar' })).toBeInTheDocument();
  expect(screen.queryByText('never-render')).toBeNull();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Delete reader' }));
  expect(callback).toHaveBeenCalledWith(account);
  if (!mobile) expect(screen.getByRole('rowheader')).toHaveAttribute('scope', 'row');
});
it.each([false, true])('disables current account with associated explanation mobile=%s', async (mobile) => {
  const callback = setup({ mobile, currentId: account.id });
  const button = screen.getByRole('button');
  expect(button).toBeDisabled();
  expect(button).toHaveAccessibleDescription('Your current account cannot be deleted.');
  await userEvent.setup().click(button);
  expect(callback).not.toHaveBeenCalled();
});
it('protects built-in admin using exact tooltip and no invented date', () => {
  setup({ account: { ...account, id: 'default-admin', username: 'admin', role: 'admin', createdAt: null } });
  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByRole('button')).toHaveAttribute('title', 'Default admin cannot be deleted.');
  expect(screen.getByText('Built-in')).toBeInTheDocument();
  expect(screen.getByText('Admin')).toHaveClass('bg-violet-100', 'text-violet-700');
});
it('renders large markup-like names literally', () => {
  const displayName = '<script>x</script>' + 'x'.repeat(10000);
  setup({ mobile: true, account: { ...account, displayName } });
  expect(screen.getByText(displayName)).toHaveClass('break-words');
  expect(screen.getByRole('article').querySelector('script')).toBeNull();
});

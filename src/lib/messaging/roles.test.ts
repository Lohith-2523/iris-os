import { describe, expect, it } from 'vitest';
import {
  isAllowedDirectPair,
  isMessagingTeamRole,
  messagingDirectoryRolesFor,
} from './roles';

describe('messaging role policy', () => {
  it('treats sub-admins as team members', () => {
    expect(isMessagingTeamRole('member')).toBe(true);
    expect(isMessagingTeamRole('sub_admin')).toBe(true);
    expect(isMessagingTeamRole('client')).toBe(false);
  });

  it.each([
    ['admin', 'member'],
    ['member', 'admin'],
    ['admin', 'sub_admin'],
    ['sub_admin', 'admin'],
    ['admin', 'client'],
    ['client', 'admin'],
  ])('allows an authorized direct pair between %s and %s', (roleA, roleB) => {
    expect(isAllowedDirectPair(roleA, roleB)).toBe(true);
  });

  it.each([
    ['admin', 'admin'],
    ['member', 'sub_admin'],
    ['sub_admin', 'client'],
    ['member', 'client'],
  ])('rejects a direct pair between %s and %s', (roleA, roleB) => {
    expect(isAllowedDirectPair(roleA, roleB)).toBe(false);
  });

  it('includes sub-admins in the admin team directory', () => {
    expect(messagingDirectoryRolesFor('admin')).toEqual(['client', 'member', 'sub_admin']);
    expect(messagingDirectoryRolesFor('sub_admin')).toEqual(['admin']);
  });
});

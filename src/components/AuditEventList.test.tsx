// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseList = vi.hoisted(() => vi.fn());

vi.mock('../crd', () => ({
  ClusterClaimClass: { useList: vi.fn() },
  ServerClaimClass: { useList: vi.fn() },
  AddonProfileClass: { useList: vi.fn() },
  SiteConfigClass: { useList: vi.fn() },
  AuditEventClass: { useList: mockUseList },
}));

vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  CommonComponents: {
    SectionBox: ({ title, children }: { title: string; children: React.ReactNode }) => (
      <div>
        <h1>{title}</h1>
        {children}
      </div>
    ),
  },
}));

import { AuditEventList } from './AuditEventList';

function makeEvent(name: string, type: string, resourceName: string, actor: string, timestamp: string) {
  return {
    jsonData: {
      metadata: { name, namespace: 'tenant-acme' },
      spec: { type, resourceName, actor, timestamp },
    },
  };
}

describe('AuditEventList', () => {
  beforeEach(() => {
    mockUseList.mockReset();
  });

  // Story 10.2 — tenant sees their audit events
  it('renders a row for each AuditEvent', () => {
    mockUseList.mockReturnValue([
      [
        makeEvent('ev-1', 'PhaseChanged', 'ml-training', 'smeltry-operator', '2026-01-01T00:00:00Z'),
        makeEvent('ev-2', 'MachineAllocated', 'ml-training', 'smeltry-operator', '2026-01-01T00:01:00Z'),
      ],
      null,
    ]);

    render(<AuditEventList />);

    expect(screen.getAllByTestId('audit-row')).toHaveLength(2);
    expect(screen.getByText('PhaseChanged')).toBeDefined();
    expect(screen.getByText('MachineAllocated')).toBeDefined();
  });

  // Story 10.2 — empty state
  it('shows an empty state message when there are no audit events', () => {
    mockUseList.mockReturnValue([[], null]);

    render(<AuditEventList />);

    expect(screen.getByText('No audit events')).toBeDefined();
  });

  // Story 10.2 — section title
  it('displays the section title "Audit History"', () => {
    mockUseList.mockReturnValue([[], null]);

    render(<AuditEventList />);

    expect(screen.getByText('Audit History')).toBeDefined();
  });

  // Story 10.2 — filter by resource name
  it('filters rows by resourceName when the user types in the search field', async () => {
    mockUseList.mockReturnValue([
      [
        makeEvent('ev-1', 'PhaseChanged', 'ml-training', 'smeltry-operator', '2026-01-01T00:00:00Z'),
        makeEvent('ev-2', 'PhaseChanged', 'build-cluster', 'smeltry-operator', '2026-01-01T00:01:00Z'),
      ],
      null,
    ]);

    render(<AuditEventList />);

    const input = screen.getByPlaceholderText('Filter by resource…');
    await userEvent.type(input, 'ml-training');

    const rows = screen.getAllByTestId('audit-row');
    expect(rows).toHaveLength(1);
    expect(screen.getByText('ml-training')).toBeDefined();
    expect(screen.queryByText('build-cluster')).toBeNull();
  });

  // Story 10.2 — 403 from kube-apiserver is shown gracefully
  it('shows an authorization error message when useList returns a 403 error', () => {
    mockUseList.mockReturnValue([null, { message: 'Forbidden' }]);

    render(<AuditEventList />);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Forbidden')).toBeDefined();
  });
});

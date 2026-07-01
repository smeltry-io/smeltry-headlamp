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

import { AdminAuditEventList } from './AdminAuditEventList';

function makeEvent(
  name: string,
  namespace: string,
  type: string,
  resourceName: string,
  actor: string,
  timestamp: string
) {
  return {
    jsonData: {
      metadata: { name, namespace },
      spec: { type, resourceName, actor, timestamp },
    },
  };
}

describe('AdminAuditEventList', () => {
  beforeEach(() => {
    mockUseList.mockReset();
  });

  // Story 10.3 — admin sees all events from all namespaces
  it('renders a row for each AuditEvent with the namespace/tenant column', () => {
    mockUseList.mockReturnValue([
      [
        makeEvent('ev-1', 'tenant-acme', 'PhaseChanged', 'ml-training', 'smeltry-operator', '2026-01-01T00:00:00Z'),
        makeEvent('ev-2', 'tenant-beta', 'ClusterDeleted', 'build-cluster', 'alice@example.com', '2026-01-01T03:00:00Z'),
      ],
      null,
    ]);

    render(<AdminAuditEventList />);

    expect(screen.getAllByTestId('admin-audit-row')).toHaveLength(2);
    expect(screen.getByText('tenant-acme')).toBeDefined();
    expect(screen.getByText('tenant-beta')).toBeDefined();
    // Use getAllByText because event types also appear in the <select> options
    expect(screen.getAllByText('PhaseChanged').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ClusterDeleted').length).toBeGreaterThanOrEqual(1);
  });

  // Story 10.3 — section title for admin view
  it('displays the section title "Global Audit Log"', () => {
    mockUseList.mockReturnValue([[], null]);

    render(<AdminAuditEventList />);

    expect(screen.getByText('Global Audit Log')).toBeDefined();
  });

  // Story 10.3 — empty state
  it('shows an empty state message when there are no audit events', () => {
    mockUseList.mockReturnValue([[], null]);

    render(<AdminAuditEventList />);

    expect(screen.getByText('No audit events')).toBeDefined();
  });

  // Story 10.3 — filter by tenant (namespace)
  it('filters rows by tenant when the admin types in the tenant filter', async () => {
    mockUseList.mockReturnValue([
      [
        makeEvent('ev-1', 'tenant-acme', 'PhaseChanged', 'ml-training', 'smeltry-operator', '2026-01-01T00:00:00Z'),
        makeEvent('ev-2', 'tenant-beta', 'PhaseChanged', 'build-cluster', 'smeltry-operator', '2026-01-01T00:01:00Z'),
      ],
      null,
    ]);

    render(<AdminAuditEventList />);

    const input = screen.getByPlaceholderText('Filter by tenant…');
    await userEvent.type(input, 'acme');

    const rows = screen.getAllByTestId('admin-audit-row');
    expect(rows).toHaveLength(1);
    expect(screen.getByText('tenant-acme')).toBeDefined();
    expect(screen.queryByText('tenant-beta')).toBeNull();
  });

  // Story 10.3 — filter by event type
  it('filters rows by event type when the admin selects a type', async () => {
    mockUseList.mockReturnValue([
      [
        makeEvent('ev-1', 'tenant-acme', 'PhaseChanged', 'ml-training', 'smeltry-operator', '2026-01-01T00:00:00Z'),
        makeEvent('ev-2', 'tenant-beta', 'ClusterDeleted', 'build-cluster', 'alice@example.com', '2026-01-01T03:00:00Z'),
        makeEvent('ev-3', 'tenant-acme', 'ClusterDeleted', 'test-cluster', 'bob@example.com', '2026-01-02T00:00:00Z'),
      ],
      null,
    ]);

    render(<AdminAuditEventList />);

    const select = screen.getByLabelText('Event type');
    await userEvent.selectOptions(select, 'ClusterDeleted');

    const rows = screen.getAllByTestId('admin-audit-row');
    expect(rows).toHaveLength(2);
    // PhaseChanged still appears in the <select> options, but not in any table row
    expect(screen.queryAllByTestId('admin-audit-row').every(
      row => !row.textContent?.includes('PhaseChanged')
    )).toBe(true);
  });

  // Story 10.3 — filter by date range (start date)
  it('excludes events before the start date when a start date is set', async () => {
    mockUseList.mockReturnValue([
      [
        makeEvent('ev-1', 'tenant-acme', 'PhaseChanged', 'old-cluster', 'smeltry-operator', '2026-01-01T00:00:00Z'),
        makeEvent('ev-2', 'tenant-acme', 'PhaseChanged', 'new-cluster', 'smeltry-operator', '2026-01-10T00:00:00Z'),
      ],
      null,
    ]);

    render(<AdminAuditEventList />);

    const startInput = screen.getByLabelText('From');
    await userEvent.type(startInput, '2026-01-05');

    const rows = screen.getAllByTestId('admin-audit-row');
    expect(rows).toHaveLength(1);
    expect(screen.getByText('new-cluster')).toBeDefined();
    expect(screen.queryByText('old-cluster')).toBeNull();
  });

  // Story 10.3 — 403 from kube-apiserver
  it('shows an authorization error message when useList returns a 403 error', () => {
    mockUseList.mockReturnValue([null, { message: 'Forbidden' }]);

    render(<AdminAuditEventList />);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Forbidden')).toBeDefined();
  });

  // Story 10.3 — events sorted by timestamp descending
  it('displays events sorted by timestamp descending', () => {
    mockUseList.mockReturnValue([
      [
        makeEvent('ev-1', 'tenant-acme', 'PhaseChanged', 'cluster-a', 'smeltry-operator', '2026-01-01T00:00:00Z'),
        makeEvent('ev-2', 'tenant-acme', 'ClusterDeleted', 'cluster-b', 'alice@example.com', '2026-01-03T00:00:00Z'),
        makeEvent('ev-3', 'tenant-acme', 'MachineAllocated', 'cluster-c', 'smeltry-operator', '2026-01-02T00:00:00Z'),
      ],
      null,
    ]);

    render(<AdminAuditEventList />);

    const rows = screen.getAllByTestId('admin-audit-row');
    // First row should be the most recent (cluster-b, Jan 3)
    expect(rows[0].textContent).toContain('cluster-b');
    // Last row should be the oldest (cluster-a, Jan 1)
    expect(rows[2].textContent).toContain('cluster-a');
  });
});

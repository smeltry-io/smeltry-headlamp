// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseList = vi.hoisted(() => vi.fn());

vi.mock('../crd', () => ({
  ClusterClaimClass: { useList: mockUseList },
  ServerClaimClass: { useList: vi.fn() },
  AddonProfileClass: { useList: vi.fn() },
  SiteConfigClass: { useList: vi.fn() },
  AuditEventClass: { useList: vi.fn() },
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

import { AdminClusterList } from './AdminClusterList';

function makeCluster(
  name: string,
  namespace: string,
  phase: string,
  site: string,
  machineCount: number
) {
  return {
    jsonData: {
      metadata: { name, namespace },
      spec: { site, machineCount },
      status: { phase },
    },
  };
}

describe('AdminClusterList', () => {
  beforeEach(() => {
    mockUseList.mockReset();
  });

  // Story 6 — admin sees all clusters from all namespaces
  it('fetches clusters cluster-wide and renders one row per cluster', () => {
    mockUseList.mockReturnValue([
      [
        makeCluster('ml-training', 'tenant-acme', 'Ready', 'paris-dc1', 3),
        makeCluster('build-cluster', 'tenant-beta', 'Provisioning', 'paris-dc1', 2),
      ],
      null,
    ]);

    render(<AdminClusterList />);

    expect(mockUseList).toHaveBeenCalledWith({ namespace: '' });
    expect(screen.getAllByTestId('admin-cluster-row')).toHaveLength(2);
    expect(screen.getByText('tenant-acme')).toBeDefined();
    expect(screen.getByText('tenant-beta')).toBeDefined();
    expect(screen.getByText('ml-training')).toBeDefined();
    expect(screen.getByText('build-cluster')).toBeDefined();
  });

  // Story 6 — section title
  it('displays the section title "All Clusters"', () => {
    mockUseList.mockReturnValue([[], null]);

    render(<AdminClusterList />);

    expect(screen.getByText('All Clusters')).toBeDefined();
  });

  // Story 6 — each row shows tenant, name, phase, site, node count
  it('renders tenant, phase, site and machine count for each cluster', () => {
    mockUseList.mockReturnValue([
      [makeCluster('ml-training', 'tenant-acme', 'Ready', 'paris-dc1', 3)],
      null,
    ]);

    render(<AdminClusterList />);

    const row = screen.getByTestId('admin-cluster-row');
    expect(row.textContent).toContain('tenant-acme');
    expect(row.textContent).toContain('ml-training');
    expect(row.textContent).toContain('Ready');
    expect(row.textContent).toContain('paris-dc1');
    expect(row.textContent).toContain('3');
  });

  // Story 6 — empty state
  it('shows an empty state message when there are no clusters', () => {
    mockUseList.mockReturnValue([[], null]);

    render(<AdminClusterList />);

    expect(screen.getByText('No clusters')).toBeDefined();
  });

  // Story 6 — filter by tenant
  it('filters rows by tenant when the admin types in the tenant filter', async () => {
    mockUseList.mockReturnValue([
      [
        makeCluster('ml-training', 'tenant-acme', 'Ready', 'paris-dc1', 3),
        makeCluster('build-cluster', 'tenant-beta', 'Ready', 'paris-dc1', 2),
      ],
      null,
    ]);

    render(<AdminClusterList />);

    const input = screen.getByPlaceholderText('Filter by tenant…');
    await userEvent.type(input, 'acme');

    const rows = screen.getAllByTestId('admin-cluster-row');
    expect(rows).toHaveLength(1);
    expect(screen.getByText('tenant-acme')).toBeDefined();
    expect(screen.queryByText('tenant-beta')).toBeNull();
  });

  // Story 6 — 403 from kube-apiserver
  it('shows an authorization error when useList returns a 403 error', () => {
    mockUseList.mockReturnValue([null, { message: 'Forbidden' }]);

    render(<AdminClusterList />);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Forbidden')).toBeDefined();
  });

  // Story 6 — loading state
  it('shows a loading indicator while data is being fetched', () => {
    mockUseList.mockReturnValue([null, null]);

    render(<AdminClusterList />);

    expect(screen.getByText('Loading…')).toBeDefined();
  });
});

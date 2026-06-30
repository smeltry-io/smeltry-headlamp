// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// vi.hoisted ensures mockUseList is initialised before the hoisted vi.mock factory runs.
const mockUseList = vi.hoisted(() => vi.fn());

vi.mock('../crd', () => ({
  ClusterClaimClass: { useList: mockUseList },
  ServerClaimClass: { useList: vi.fn() },
}));

vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  CommonComponents: {
    SectionBox: ({ title, children }: { title: string; children: React.ReactNode }) => (
      <div>
        <h1>{title}</h1>
        {children}
      </div>
    ),
    // Simplified stand-in for ResourceTable that covers the states exercised
    // by these tests. Uses jsonData.metadata.name as the stable key to avoid
    // React index-key warnings when items are reordered.
    ResourceTable: ({
      data,
      errorMessage,
    }: {
      data: unknown[] | null;
      errorMessage?: string | null;
      columns: unknown[];
    }) => {
      if (errorMessage) return <div role="alert">{errorMessage}</div>;
      if (data === null) return <div>Loading…</div>;
      if (data.length === 0) return <div>No clusters found</div>;
      return (
        <table>
          <tbody>
            {(data as Array<{ jsonData: { metadata: { name: string } } }>).map(item => (
              <tr key={item.jsonData.metadata.name} data-testid="cluster-row">
                <td>{item.jsonData.metadata.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    },
  },
}));

import { ClusterClaimList } from './ClusterClaimList';

function makeItem(name: string, phase: string, site: string, machineCount: number) {
  return {
    jsonData: {
      metadata: { name, namespace: 'tenant-acme' },
      spec: { site, machineCount },
      status: { phase },
    },
  };
}

describe('ClusterClaimList', () => {
  beforeEach(() => {
    mockUseList.mockReset();
  });

  // Story 6 — user sees their clusters
  it('renders a row for each ClusterClaim', () => {
    mockUseList.mockReturnValue([
      [makeItem('ml-training', 'Ready', 'paris-dc1', 3),
       makeItem('build-cluster', 'Provisioning', 'paris-dc1', 2)],
      null,
    ]);

    render(<ClusterClaimList />);

    expect(screen.getAllByTestId('cluster-row')).toHaveLength(2);
    expect(screen.getByText('ml-training')).toBeDefined();
    expect(screen.getByText('build-cluster')).toBeDefined();
  });

  // Story 6 — loading state while fetch is in progress
  it('shows a loading indicator while data is null', () => {
    mockUseList.mockReturnValue([null, null]);

    render(<ClusterClaimList />);

    expect(screen.getByText('Loading…')).toBeDefined();
  });

  // Story 6 — empty state with creation prompt
  it('shows an empty state when there are no clusters', () => {
    mockUseList.mockReturnValue([[], null]);

    render(<ClusterClaimList />);

    expect(screen.getByText('No clusters found')).toBeDefined();
  });

  // Story 6 — section title
  it('displays the section title "Clusters"', () => {
    mockUseList.mockReturnValue([[], null]);

    render(<ClusterClaimList />);

    expect(screen.getByText('Clusters')).toBeDefined();
  });

  // Story 6 — API error (e.g. 403 from kube-apiserver) is surfaced to the user
  it('passes the API error message to the table when useList returns an error', () => {
    mockUseList.mockReturnValue([null, { message: 'Forbidden' }]);

    render(<ClusterClaimList />);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Forbidden')).toBeDefined();
  });
});

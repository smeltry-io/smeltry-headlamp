// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseList = vi.hoisted(() => vi.fn());

vi.mock('../crd', () => ({
  ClusterClaimClass: { useList: vi.fn() },
  ServerClaimClass: { useList: mockUseList },
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

import { AdminMachineList } from './AdminMachineList';

function makeServer(
  name: string,
  namespace: string,
  phase: string,
  site: string,
  machineClass: string,
  serverIP = ''
) {
  return {
    jsonData: {
      metadata: { name, namespace },
      spec: { site, machineClass, os: 'flatcar' },
      status: { phase, serverIP },
    },
  };
}

describe('AdminMachineList', () => {
  beforeEach(() => {
    mockUseList.mockReset();
  });

  it('fetches servers cluster-wide and renders one row per server', () => {
    mockUseList.mockReturnValue([
      [
        makeServer('build-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard', '10.0.1.10'),
        makeServer('build-02', 'tenant-beta', 'Provisioning', 'paris-dc1', 'gpu-large'),
      ],
      null,
    ]);

    render(<AdminMachineList />);

    expect(mockUseList).toHaveBeenCalledWith({ namespace: '' });
    expect(screen.getAllByTestId('admin-machine-row')).toHaveLength(2);
    expect(screen.getByText('tenant-acme')).toBeDefined();
    expect(screen.getByText('tenant-beta')).toBeDefined();
    expect(screen.getByText('build-01')).toBeDefined();
    expect(screen.getByText('build-02')).toBeDefined();
  });

  it('displays the section title "All Machines"', () => {
    mockUseList.mockReturnValue([[], null]);

    render(<AdminMachineList />);

    expect(screen.getByText('All Machines')).toBeDefined();
  });

  it('renders tenant, name, phase, site, class and IP for each server', () => {
    mockUseList.mockReturnValue([
      [makeServer('build-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard', '10.0.1.10')],
      null,
    ]);

    render(<AdminMachineList />);

    const row = screen.getByTestId('admin-machine-row');
    expect(row.textContent).toContain('tenant-acme');
    expect(row.textContent).toContain('build-01');
    expect(row.textContent).toContain('Ready');
    expect(row.textContent).toContain('paris-dc1');
    expect(row.textContent).toContain('standard');
    expect(row.textContent).toContain('10.0.1.10');
  });

  it('shows an empty state message when there are no servers', () => {
    mockUseList.mockReturnValue([[], null]);

    render(<AdminMachineList />);

    expect(screen.getByText('No machines')).toBeDefined();
  });

  it('filters rows by site', async () => {
    mockUseList.mockReturnValue([
      [
        makeServer('build-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard'),
        makeServer('build-02', 'tenant-beta', 'Ready', 'lyon-dc2', 'standard'),
      ],
      null,
    ]);

    render(<AdminMachineList />);

    const input = screen.getByPlaceholderText('Filter by site…');
    await userEvent.type(input, 'paris');

    const rows = screen.getAllByTestId('admin-machine-row');
    expect(rows).toHaveLength(1);
    expect(screen.getByText('build-01')).toBeDefined();
    expect(screen.queryByText('build-02')).toBeNull();
  });

  it('filters rows by machine class', async () => {
    mockUseList.mockReturnValue([
      [
        makeServer('build-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard'),
        makeServer('gpu-01', 'tenant-beta', 'Ready', 'paris-dc1', 'gpu-large'),
      ],
      null,
    ]);

    render(<AdminMachineList />);

    const input = screen.getByPlaceholderText('Filter by class…');
    await userEvent.type(input, 'gpu');

    const rows = screen.getAllByTestId('admin-machine-row');
    expect(rows).toHaveLength(1);
    expect(screen.getByText('gpu-01')).toBeDefined();
    expect(screen.queryByText('build-01')).toBeNull();
  });

  it('filters rows by status (phase)', async () => {
    mockUseList.mockReturnValue([
      [
        makeServer('build-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard'),
        makeServer('build-02', 'tenant-beta', 'Failed', 'paris-dc1', 'standard'),
      ],
      null,
    ]);

    render(<AdminMachineList />);

    const input = screen.getByPlaceholderText('Filter by status…');
    await userEvent.type(input, 'Failed');

    const rows = screen.getAllByTestId('admin-machine-row');
    expect(rows).toHaveLength(1);
    expect(screen.getByText('build-02')).toBeDefined();
    expect(screen.queryByText('build-01')).toBeNull();
  });

  it('highlights degraded machines with a data attribute', () => {
    mockUseList.mockReturnValue([
      [makeServer('bad-01', 'tenant-acme', 'Failed', 'paris-dc1', 'standard')],
      null,
    ]);

    render(<AdminMachineList />);

    const row = screen.getByTestId('admin-machine-row');
    expect(row.getAttribute('data-degraded')).toBe('true');
  });

  it('does not mark healthy machines as degraded', () => {
    mockUseList.mockReturnValue([
      [makeServer('build-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard')],
      null,
    ]);

    render(<AdminMachineList />);

    const row = screen.getByTestId('admin-machine-row');
    expect(row.getAttribute('data-degraded')).toBe('false');
  });

  it('shows an authorization error when useList returns a 403 error', () => {
    mockUseList.mockReturnValue([null, { message: 'Forbidden' }]);

    render(<AdminMachineList />);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Forbidden')).toBeDefined();
  });

  it('shows a loading indicator while data is being fetched', () => {
    mockUseList.mockReturnValue([null, null]);

    render(<AdminMachineList />);

    expect(screen.getByText('Loading…')).toBeDefined();
  });

  it('shows a distinct message when a filter matches no machine', async () => {
    mockUseList.mockReturnValue([
      [makeServer('build-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard')],
      null,
    ]);

    render(<AdminMachineList />);

    const input = screen.getByPlaceholderText('Filter by site…');
    await userEvent.type(input, 'xyz');

    expect(screen.queryByTestId('admin-machine-row')).toBeNull();
    expect(screen.getByText('No machines match the current filters')).toBeDefined();
    expect(screen.queryByText('No machines')).toBeNull();
  });
});

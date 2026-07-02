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

import { MachineHealth } from './MachineHealth';

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

describe('MachineHealth', () => {
  beforeEach(() => {
    mockUseList.mockReset();
  });

  it('renders the section title "Machine Health"', () => {
    mockUseList.mockReturnValue([[], null]);
    render(<MachineHealth />);
    expect(screen.getByText('Machine Health')).toBeDefined();
  });

  it('fetches ServerClaims cluster-wide', () => {
    mockUseList.mockReturnValue([[], null]);
    render(<MachineHealth />);
    expect(mockUseList).toHaveBeenCalledWith({ namespace: '' });
  });

  it('shows a loading indicator while data is being fetched', () => {
    mockUseList.mockReturnValue([null, null]);
    render(<MachineHealth />);
    expect(screen.getByText('Loading…')).toBeDefined();
  });

  it('shows an error message on API failure', () => {
    mockUseList.mockReturnValue([null, { message: 'Forbidden' }]);
    render(<MachineHealth />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Forbidden')).toBeDefined();
  });

  it('shows an empty state when no machines exist', () => {
    mockUseList.mockReturnValue([[], null]);
    render(<MachineHealth />);
    expect(screen.getByText('No machines')).toBeDefined();
    expect(screen.queryByText('All healthy')).toBeNull();
  });

  it('renders one row per machine with name, namespace, phase, site, class and IP', () => {
    mockUseList.mockReturnValue([
      [makeServer('build-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard', '10.0.1.10')],
      null,
    ]);
    render(<MachineHealth />);
    const row = screen.getByTestId('machine-health-row');
    expect(row.textContent).toContain('build-01');
    expect(row.textContent).toContain('tenant-acme');
    expect(row.textContent).toContain('Ready');
    expect(row.textContent).toContain('paris-dc1');
    expect(row.textContent).toContain('standard');
    expect(row.textContent).toContain('10.0.1.10');
  });

  it('marks Failed machines as degraded via data-degraded attribute', () => {
    mockUseList.mockReturnValue([
      [makeServer('bad-01', 'tenant-acme', 'Failed', 'paris-dc1', 'standard')],
      null,
    ]);
    render(<MachineHealth />);
    const row = screen.getByTestId('machine-health-row');
    expect(row.getAttribute('data-degraded')).toBe('true');
  });

  it('does not mark healthy machines as degraded', () => {
    mockUseList.mockReturnValue([
      [makeServer('ok-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard')],
      null,
    ]);
    render(<MachineHealth />);
    const row = screen.getByTestId('machine-health-row');
    expect(row.getAttribute('data-degraded')).toBe('false');
  });

  it('shows a summary count of degraded machines', () => {
    mockUseList.mockReturnValue([
      [
        makeServer('build-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard'),
        makeServer('bad-01', 'tenant-acme', 'Failed', 'paris-dc1', 'standard'),
        makeServer('bad-02', 'tenant-beta', 'Failed', 'lyon-dc2', 'gpu-large'),
      ],
      null,
    ]);
    render(<MachineHealth />);
    expect(screen.getByText('2 degraded')).toBeDefined();
  });

  it('shows "All healthy" when no machine is degraded', () => {
    mockUseList.mockReturnValue([
      [
        makeServer('build-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard'),
        makeServer('build-02', 'tenant-beta', 'Ready', 'lyon-dc2', 'standard'),
      ],
      null,
    ]);
    render(<MachineHealth />);
    expect(screen.getByText('All healthy')).toBeDefined();
  });

  it('renders an Export button', () => {
    mockUseList.mockReturnValue([[], null]);
    render(<MachineHealth />);
    expect(screen.getByRole('button', { name: /export/i })).toBeDefined();
  });

  it('triggers a CSV download when Export is clicked', async () => {
    mockUseList.mockReturnValue([
      [makeServer('build-01', 'tenant-acme', 'Ready', 'paris-dc1', 'standard', '10.0.1.10')],
      null,
    ]);

    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    // Render first so the DOM container is created before any mocking of createElement
    render(<MachineHealth />);

    const clickFn = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click: clickFn, remove: vi.fn() } as unknown as HTMLElement;
      }
      return originalCreateElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(el => el);
    vi.spyOn(document.body, 'removeChild').mockImplementation(el => el);

    await userEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickFn).toHaveBeenCalled();

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

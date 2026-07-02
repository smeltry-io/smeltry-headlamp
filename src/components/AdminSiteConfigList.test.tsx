// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseList = vi.hoisted(() => vi.fn());

vi.mock('../crd', () => ({
  ClusterClaimClass: { useList: vi.fn() },
  ServerClaimClass: { useList: vi.fn() },
  AddonProfileClass: { useList: vi.fn() },
  SiteConfigClass: { useList: mockUseList },
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

import { AdminSiteConfigList } from './AdminSiteConfigList';

function makeSite(name: string, cidr: string, zone: string, l2Pool: string) {
  return {
    jsonData: {
      metadata: { name, namespace: 'portal-system' },
      spec: {
        network: { provisioningCIDR: cidr },
        dns: { zone },
        cilium: { l2PoolName: l2Pool },
      },
    },
  };
}

describe('AdminSiteConfigList', () => {
  beforeEach(() => {
    mockUseList.mockReset();
  });

  it('renders the section title "Sites"', () => {
    mockUseList.mockReturnValue([[], null]);
    render(<AdminSiteConfigList />);
    expect(screen.getByText('Sites')).toBeDefined();
  });

  it('fetches SiteConfigs from portal-system namespace', () => {
    mockUseList.mockReturnValue([[], null]);
    render(<AdminSiteConfigList />);
    expect(mockUseList).toHaveBeenCalledWith({ namespace: 'portal-system' });
  });

  it('shows a loading indicator while data is being fetched', () => {
    mockUseList.mockReturnValue([null, null]);
    render(<AdminSiteConfigList />);
    expect(screen.getByText('Loading…')).toBeDefined();
  });

  it('shows an error message on 403', () => {
    mockUseList.mockReturnValue([null, { message: 'Forbidden' }]);
    render(<AdminSiteConfigList />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Forbidden')).toBeDefined();
  });

  it('shows an empty state when no sites exist', () => {
    mockUseList.mockReturnValue([[], null]);
    render(<AdminSiteConfigList />);
    expect(screen.getByText('No sites')).toBeDefined();
  });

  it('renders one row per site with name, CIDR, DNS zone and L2 pool', () => {
    mockUseList.mockReturnValue([
      [makeSite('paris-dc1', '10.0.1.0/24', 'infra.example.com', 'provisioning-pool')],
      null,
    ]);
    render(<AdminSiteConfigList />);
    const row = screen.getByTestId('siteconfig-row');
    expect(row.textContent).toContain('paris-dc1');
    expect(row.textContent).toContain('10.0.1.0/24');
    expect(row.textContent).toContain('infra.example.com');
    expect(row.textContent).toContain('provisioning-pool');
  });

  it('shows em-dash for missing spec fields', () => {
    mockUseList.mockReturnValue([
      [{ jsonData: { metadata: { name: 'bare', namespace: 'portal-system' }, spec: {} } }],
      null,
    ]);
    render(<AdminSiteConfigList />);
    const row = screen.getByTestId('siteconfig-row');
    expect(row.textContent?.match(/—/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('renders multiple rows when multiple sites exist', () => {
    mockUseList.mockReturnValue([
      [
        makeSite('paris-dc1', '10.0.1.0/24', 'infra.example.com', 'pool-paris'),
        makeSite('lyon-dc2', '10.0.2.0/24', 'infra.example.com', 'pool-lyon'),
      ],
      null,
    ]);
    render(<AdminSiteConfigList />);
    const rows = screen.getAllByTestId('siteconfig-row');
    expect(rows).toHaveLength(2);
  });
});

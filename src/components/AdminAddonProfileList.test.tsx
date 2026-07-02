// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseList = vi.hoisted(() => vi.fn());

vi.mock('../crd', () => ({
  ClusterClaimClass: { useList: vi.fn() },
  ServerClaimClass: { useList: vi.fn() },
  AddonProfileClass: { useList: mockUseList },
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

import { AdminAddonProfileList } from './AdminAddonProfileList';

function makeProfile(
  name: string,
  description: string,
  components: { name: string; required: boolean; order: number }[]
) {
  return {
    jsonData: {
      metadata: { name, namespace: 'portal-system' },
      spec: { description, components },
    },
  };
}

describe('AdminAddonProfileList', () => {
  beforeEach(() => {
    mockUseList.mockReset();
  });

  it('renders the section title "Addon Profiles"', () => {
    mockUseList.mockReturnValue([[], null]);
    render(<AdminAddonProfileList />);
    expect(screen.getByText('Addon Profiles')).toBeDefined();
  });

  it('fetches AddonProfiles from portal-system namespace', () => {
    mockUseList.mockReturnValue([[], null]);
    render(<AdminAddonProfileList />);
    expect(mockUseList).toHaveBeenCalledWith({ namespace: 'portal-system' });
  });

  it('shows a loading indicator while data is being fetched', () => {
    mockUseList.mockReturnValue([null, null]);
    render(<AdminAddonProfileList />);
    expect(screen.getByText('Loading…')).toBeDefined();
  });

  it('shows an error message on 403', () => {
    mockUseList.mockReturnValue([null, { message: 'Forbidden' }]);
    render(<AdminAddonProfileList />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Forbidden')).toBeDefined();
  });

  it('shows an empty state when no addon profiles exist', () => {
    mockUseList.mockReturnValue([[], null]);
    render(<AdminAddonProfileList />);
    expect(screen.getByText('No addon profiles')).toBeDefined();
  });

  it('renders one row per profile with name, description and component count', () => {
    mockUseList.mockReturnValue([
      [
        makeProfile('gpu-compute', 'Cilium + Ingress + Rook-Ceph + GPU operator', [
          { name: 'cilium', required: true, order: 1 },
          { name: 'ingress', required: true, order: 2 },
          { name: 'rook-ceph', required: false, order: 3 },
          { name: 'gpu-operator', required: false, order: 4 },
        ]),
      ],
      null,
    ]);
    render(<AdminAddonProfileList />);
    const row = screen.getByTestId('addonprofile-row');
    expect(row.textContent).toContain('gpu-compute');
    expect(row.textContent).toContain('Cilium + Ingress + Rook-Ceph + GPU operator');
    expect(row.textContent).toContain('4');
  });

  it('lists component names in order within the row', () => {
    mockUseList.mockReturnValue([
      [
        makeProfile('basic', 'Basic stack', [
          { name: 'cilium', required: true, order: 1 },
          { name: 'ingress', required: true, order: 2 },
        ]),
      ],
      null,
    ]);
    render(<AdminAddonProfileList />);
    const row = screen.getByTestId('addonprofile-row');
    expect(row.textContent).toContain('cilium');
    expect(row.textContent).toContain('ingress');
  });

  it('shows em-dash when description is absent', () => {
    mockUseList.mockReturnValue([
      [
        {
          jsonData: {
            metadata: { name: 'bare', namespace: 'portal-system' },
            spec: { components: [] },
          },
        },
      ],
      null,
    ]);
    render(<AdminAddonProfileList />);
    const row = screen.getByTestId('addonprofile-row');
    expect(row.textContent).toContain('—');
  });

  it('renders multiple rows when multiple profiles exist', () => {
    mockUseList.mockReturnValue([
      [
        makeProfile('basic', 'Basic', [{ name: 'cilium', required: true, order: 1 }]),
        makeProfile('gpu-compute', 'GPU', [{ name: 'gpu-operator', required: false, order: 1 }]),
      ],
      null,
    ]);
    render(<AdminAddonProfileList />);
    const rows = screen.getAllByTestId('addonprofile-row');
    expect(rows).toHaveLength(2);
  });
});

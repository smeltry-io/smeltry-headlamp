// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseGet = vi.hoisted(() => vi.fn());

vi.mock('../crd', () => ({
  ClusterClaimClass: { useGet: mockUseGet },
  ServerClaimClass: { useGet: vi.fn() },
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

import { ClusterClaimDetail } from './ClusterClaimDetail';

function makeClaim(overrides: Record<string, unknown> = {}) {
  return {
    jsonData: {
      metadata: { name: 'ml-training', namespace: 'tenant-acme' },
      spec: { site: 'paris-dc1', machineCount: 3, addonProfile: 'gpu-compute' },
      status: {
        phase: 'Ready',
        controlPlaneIP: '10.0.1.1',
        controlPlaneDNS: 'ml-training-api.acme.infra.example.com',
        webhookIP: '10.0.1.2',
        webhookDNS: 'ml-training-wh.acme.infra.example.com',
        kubeconfigSecret: 'ml-training-kubeconfig',
        conditions: [],
      },
      ...overrides,
    },
  };
}

describe('ClusterClaimDetail', () => {
  beforeEach(() => {
    mockUseGet.mockReset();
  });

  // Story 6 — detail view shows phase
  it('displays the cluster phase', () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.getByText('Ready')).toBeDefined();
  });

  // Story 6 — detail view shows control plane IP and DNS
  it('displays the control plane IP and DNS', () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.getByText('10.0.1.1')).toBeDefined();
    expect(screen.getByText('ml-training-api.acme.infra.example.com')).toBeDefined();
  });

  // Story 6 — detail view shows webhook IP
  it('displays the webhook IP', () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.getByText('10.0.1.2')).toBeDefined();
  });

  // Story 6 — actions disabled while not Ready
  it('shows a provisioning notice when cluster is not Ready', () => {
    mockUseGet.mockReturnValue([makeClaim({ status: { phase: 'Provisioning' } }), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.getAllByText('Provisioning').length).toBeGreaterThan(0);
    expect(screen.getByTestId('actions-disabled-notice')).toBeDefined();
  });

  // Story 6 — loading state
  it('shows loading state while data is null', () => {
    mockUseGet.mockReturnValue([null, null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.getByText('Loading…')).toBeDefined();
  });

  // Story 6 — API error
  it('shows an error message when useGet returns an error', () => {
    mockUseGet.mockReturnValue([null, { message: 'Not found' }]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Not found')).toBeDefined();
  });
});

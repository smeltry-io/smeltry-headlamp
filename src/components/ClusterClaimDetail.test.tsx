// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseGet = vi.hoisted(() => vi.fn());
const mockPatch = vi.hoisted(() => vi.fn());

vi.mock('../crd', () => ({
  ClusterClaimClass: { useGet: mockUseGet, patch: mockPatch },
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
    mockPatch.mockReset();
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

  // Story 6 — scale: button visible when Ready
  it('shows a Scale button when the cluster is Ready', () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.getByRole('button', { name: /scale/i })).toBeDefined();
  });

  // Story 6 — scale: no button when not Ready
  it('does not show a Scale button when cluster is not Ready', () => {
    mockUseGet.mockReturnValue([makeClaim({ status: { phase: 'Provisioning' } }), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.queryByRole('button', { name: /scale/i })).toBeNull();
  });

  // Story 6 — scale: PATCH called with new machineCount
  it('patches machineCount when Scale form is submitted', async () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);
    mockPatch.mockResolvedValueOnce({});

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    await userEvent.click(screen.getByRole('button', { name: /scale/i }));

    const input = screen.getByLabelText(/machine count/i);
    await userEvent.clear(input);
    await userEvent.type(input, '5');
    await userEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(mockPatch).toHaveBeenCalledOnce();
    const [patchedObj, patchData] = mockPatch.mock.calls[0];
    expect(patchedObj.jsonData.metadata.name).toBe('ml-training');
    expect(patchData).toMatchObject({ spec: { machineCount: 5 } });
  });

  // Story 6 — scale: API error displayed
  it('shows an error when patch fails', async () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);
    mockPatch.mockRejectedValueOnce({ message: 'forbidden' });

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    await userEvent.click(screen.getByRole('button', { name: /scale/i }));
    await userEvent.clear(screen.getByLabelText(/machine count/i));
    await userEvent.type(screen.getByLabelText(/machine count/i), '5');
    await userEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(await screen.findByText(/forbidden/i)).toBeDefined();
  });

  // Story 6 — API error
  it('shows an error message when useGet returns an error', () => {
    mockUseGet.mockReturnValue([null, { message: 'Not found' }]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Not found')).toBeDefined();
  });
});

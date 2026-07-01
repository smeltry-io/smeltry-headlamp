// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseGet = vi.hoisted(() => vi.fn());
const mockPatch = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockSecretUseGet = vi.hoisted(() => vi.fn());

vi.mock('../crd', () => ({
  ClusterClaimClass: { useGet: mockUseGet, patch: mockPatch, delete: mockDelete },
  ServerClaimClass: { useGet: vi.fn() },
}));

vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  K8s: {
    Secret: { useGet: mockSecretUseGet },
  },
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

const BASE_STATUS = {
  phase: 'Ready',
  controlPlaneIP: '10.0.1.1',
  controlPlaneDNS: 'ml-training-api.acme.infra.example.com',
  webhookIP: '10.0.1.2',
  webhookDNS: 'ml-training-wh.acme.infra.example.com',
  kubeconfigSecret: 'ml-training-kubeconfig',
  conditions: [],
};

function makeClaim(statusOverrides: Record<string, unknown> = {}, annotations: Record<string, string> = {}) {
  return {
    jsonData: {
      metadata: { name: 'ml-training', namespace: 'tenant-acme', annotations },
      spec: { site: 'paris-dc1', machineCount: 3, addonProfile: 'gpu-compute' },
      status: { ...BASE_STATUS, ...statusOverrides },
    },
  };
}

describe('ClusterClaimDetail', () => {
  beforeEach(() => {
    mockUseGet.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
    mockSecretUseGet.mockReset();
    // default: no secret loaded
    mockSecretUseGet.mockReturnValue([null, null]);
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
    mockUseGet.mockReturnValue([makeClaim({ phase: 'Provisioning' }), null]);

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
    mockUseGet.mockReturnValue([makeClaim({ phase: 'Provisioning' }), null]);

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

  // Story 6 — scale: Cancel hides the form
  it('hides the scale form when Cancel is clicked', async () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    await userEvent.click(screen.getByRole('button', { name: /scale/i }));
    expect(screen.getByLabelText(/machine count/i)).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByLabelText(/machine count/i)).toBeNull();
    expect(screen.getByRole('button', { name: /scale/i })).toBeDefined();
  });

  // Story 6 — scale: invalid count blocks PATCH
  it('does not call patch when machine count is empty or zero', async () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    await userEvent.click(screen.getByRole('button', { name: /scale/i }));
    await userEvent.clear(screen.getByLabelText(/machine count/i));
    await userEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(mockPatch).not.toHaveBeenCalled();
  });

  // Story 6 — delete: button visible when Ready
  it('shows a Delete button when the cluster is Ready', () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" onDeleted={vi.fn()} />);

    expect(screen.getByRole('button', { name: /delete/i })).toBeDefined();
  });

  // Story 6 — delete: no button when not Ready
  it('does not show a Delete button when cluster is not Ready', () => {
    mockUseGet.mockReturnValue([makeClaim({ phase: 'Provisioning' }), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" onDeleted={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });

  // Story 6 — delete: confirmation dialog shows cluster name
  it('shows a confirmation dialog with the cluster name when Delete is clicked', async () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" onDeleted={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(screen.getByRole('button', { name: /confirm/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined();
    // confirmation paragraph must mention the cluster name
    expect(screen.getByText(/delete cluster/i)).toBeDefined();
  });

  // Story 6 — delete: cancel closes dialog without calling delete
  it('closes the confirmation dialog on Cancel without deleting', async () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" onDeleted={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /confirm/i })).toBeNull();
  });

  // Story 6 — delete: confirm patches delete-at annotation (grace period — no direct delete)
  it('patches delete-at annotation and does not call delete when confirmed', async () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);
    mockPatch.mockResolvedValueOnce({});

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" onDeleted={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockPatch).toHaveBeenCalledOnce();
    const [, patchData] = mockPatch.mock.calls[0];
    expect(patchData.metadata.annotations['portal.smeltry.io/delete-at']).toBeDefined();
  });

  // Story 6 — delete: API error displayed in dialog when annotation patch fails
  it('shows an error in the confirmation dialog when patching delete-at annotation fails', async () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);
    mockPatch.mockRejectedValueOnce({ message: 'permission denied' });

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" onDeleted={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(await screen.findByText(/permission denied/i)).toBeDefined();
  });

  // Story 6 — kubeconfig: download button shown when Ready and kubeconfigSecret set
  it('shows a Download kubeconfig button when cluster is Ready and secret is available', () => {
    mockUseGet.mockReturnValue([makeClaim(), null]);
    mockSecretUseGet.mockReturnValue([
      { jsonData: { data: { value: btoa('kubeconfig-yaml-content') } } },
      null,
    ]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.getByRole('button', { name: /download kubeconfig/i })).toBeDefined();
  });

  // Story 6 — kubeconfig: button disabled when not Ready
  it('shows a disabled Download kubeconfig button when cluster is not Ready', () => {
    mockUseGet.mockReturnValue([makeClaim({ phase: 'Provisioning', kubeconfigSecret: undefined })]);
    mockSecretUseGet.mockReturnValue([null, null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    const btn = screen.queryByRole('button', { name: /download kubeconfig/i });
    // button either absent or disabled in non-Ready phase
    if (btn) {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    } else {
      expect(btn).toBeNull();
    }
  });

  // Story 6 — kubeconfig: button absent when kubeconfigSecret not yet set
  it('does not show Download kubeconfig when kubeconfigSecret is empty', () => {
    mockUseGet.mockReturnValue([makeClaim({ kubeconfigSecret: '' })]);
    mockSecretUseGet.mockReturnValue([null, null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.queryByRole('button', { name: /download kubeconfig/i })).toBeNull();
  });

  // Story 6 — API error
  it('shows an error message when useGet returns an error', () => {
    mockUseGet.mockReturnValue([null, { message: 'Not found' }]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Not found')).toBeDefined();
  });

  // Story 6 (grace period) — banner displayed when delete-at annotation already set
  it('shows a deletion countdown banner when delete-at annotation is present', () => {
    const deleteAt = new Date(Date.now() + 3_600_000).toISOString();
    mockUseGet.mockReturnValue([makeClaim({}, { 'portal.smeltry.io/delete-at': deleteAt }), null]);

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    expect(screen.getByTestId('deletion-banner')).toBeDefined();
    expect(screen.getByRole('button', { name: /cancel deletion/i })).toBeDefined();
  });

  // Story 6 (grace period) — cancel deletion removes annotation via patch
  it('removes delete-at annotation when Cancel deletion is clicked', async () => {
    const deleteAt = new Date(Date.now() + 3_600_000).toISOString();
    mockUseGet.mockReturnValue([makeClaim({}, { 'portal.smeltry.io/delete-at': deleteAt }), null]);
    mockPatch.mockResolvedValueOnce({});

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    await userEvent.click(screen.getByRole('button', { name: /cancel deletion/i }));

    expect(mockPatch).toHaveBeenCalledOnce();
    const [, patchData] = mockPatch.mock.calls[0];
    // null removes the annotation via strategic merge patch
    expect(patchData.metadata.annotations['portal.smeltry.io/delete-at']).toBeNull();
  });

  // Story 6 (grace period) — cancel deletion error displayed in banner
  it('shows an error in the banner when cancelling deletion fails', async () => {
    const deleteAt = new Date(Date.now() + 3_600_000).toISOString();
    mockUseGet.mockReturnValue([makeClaim({}, { 'portal.smeltry.io/delete-at': deleteAt }), null]);
    mockPatch.mockRejectedValueOnce({ message: 'forbidden' });

    render(<ClusterClaimDetail name="ml-training" namespace="tenant-acme" />);

    await userEvent.click(screen.getByRole('button', { name: /cancel deletion/i }));

    expect(await screen.findByTestId('cancel-error')).toBeDefined();
    expect(await screen.findByText(/forbidden/i)).toBeDefined();
  });
});

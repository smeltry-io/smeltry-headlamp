// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAddonUseList = vi.hoisted(() => vi.fn());
const mockSiteUseList = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('../crd', () => ({
  ClusterClaimClass: { useList: vi.fn(), create: mockCreate },
  AddonProfileClass: { useList: mockAddonUseList },
  SiteConfigClass: { useList: mockSiteUseList },
}));

vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  CommonComponents: {
    SectionBox: ({ title, children }: { title: string; children: React.ReactNode }) => (
      <div><h1>{title}</h1>{children}</div>
    ),
  },
}));

import { ClusterClaimForm } from './ClusterClaimForm';

interface MachineClassSummary {
  machineClass: string;
  availableCount: number;
  tags?: string[];
}

function makeAddonProfile(name: string, requiredTags: string[] = []) {
  return {
    jsonData: {
      metadata: { name },
      spec: {
        description: name,
        machineConstraints: requiredTags.length > 0 ? { requiredTags } : undefined,
      },
    },
  };
}

function makeSiteConfig(name: string, machineClasses: MachineClassSummary[] = []) {
  return {
    jsonData: {
      metadata: { name },
      status: { machineClasses },
    },
  };
}

describe('ClusterClaimForm', () => {
  beforeEach(() => {
    mockAddonUseList.mockReset();
    mockSiteUseList.mockReset();
    mockCreate.mockReset();
  });

  // Story 6 — form renders site and addon selectors
  it('renders site and addon profile selectors populated from the catalog', () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('gpu-compute'), makeAddonProfile('default')], null]);
    mockSiteUseList.mockReturnValue([[makeSiteConfig('paris-dc1'), makeSiteConfig('lyon-dc2')], null]);

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    expect(screen.getByLabelText('AddonProfile')).toBeDefined();
    expect(screen.getByLabelText('Site')).toBeDefined();
    expect(screen.getByLabelText('Machine count')).toBeDefined();
  });

  // Story 6 — submit button disabled while form is invalid
  it('disables the submit button when required fields are empty', () => {
    mockAddonUseList.mockReturnValue([[], null]);
    mockSiteUseList.mockReturnValue([[], null]);

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    const btn = screen.getByRole('button', { name: /create/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  // Story 6 — client-side validation before API call
  it('does not call create when the form is submitted empty', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('default')], null]);
    mockSiteUseList.mockReturnValue([[makeSiteConfig('paris-dc1')], null]);

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    const btn = screen.getByRole('button', { name: /create/i });
    await userEvent.click(btn);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  // Story 6 — API error displayed on submit
  it('shows an API error message when create fails', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('default')], null]);
    mockSiteUseList.mockReturnValue([[makeSiteConfig('paris-dc1', [{ machineClass: 'standard', availableCount: 2 }])], null]);
    mockCreate.mockRejectedValueOnce({ message: 'quota exceeded' });

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('AddonProfile'), 'default');
    await userEvent.selectOptions(screen.getByLabelText('Site'), 'paris-dc1');
    await userEvent.selectOptions(screen.getByLabelText('Machine class'), 'standard');
    await userEvent.clear(screen.getByLabelText('Machine count'));
    await userEvent.type(screen.getByLabelText('Machine count'), '3');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(await screen.findByText(/quota exceeded/i)).toBeDefined();
  });

  // Story 6 — happy path: onSuccess called after successful create
  it('calls onSuccess with the cluster name after successful create', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('default')], null]);
    mockSiteUseList.mockReturnValue([[makeSiteConfig('paris-dc1', [{ machineClass: 'standard', availableCount: 2 }])], null]);
    mockCreate.mockResolvedValueOnce({});
    const onSuccess = vi.fn();

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={onSuccess} />);

    await userEvent.selectOptions(screen.getByLabelText('AddonProfile'), 'default');
    await userEvent.selectOptions(screen.getByLabelText('Site'), 'paris-dc1');
    await userEvent.selectOptions(screen.getByLabelText('Machine class'), 'standard');
    await userEvent.clear(screen.getByLabelText('Machine count'));
    await userEvent.type(screen.getByLabelText('Machine count'), '2');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    expect(onSuccess).toHaveBeenCalledOnce();
    const [name] = onSuccess.mock.calls[0];
    expect(name).toMatch(/^default-\d+$/);
  });

  // Story 6 — machineCount = 0 keeps submit disabled
  it('disables submit when machine count is set to 0', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('default')], null]);
    mockSiteUseList.mockReturnValue([[makeSiteConfig('paris-dc1')], null]);

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('AddonProfile'), 'default');
    await userEvent.selectOptions(screen.getByLabelText('Site'), 'paris-dc1');
    await userEvent.clear(screen.getByLabelText('Machine count'));
    await userEvent.type(screen.getByLabelText('Machine count'), '0');

    const btn = screen.getByRole('button', { name: /create/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  // Story — machine type selector: options shown from SiteConfig.status.machineClasses
  it('shows machine class options from the selected site status', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('default')], null]);
    mockSiteUseList.mockReturnValue([[
      makeSiteConfig('paris-dc1', [
        { machineClass: 'gpu-large', availableCount: 3, tags: ['gpu'] },
        { machineClass: 'standard', availableCount: 5 },
      ]),
    ], null]);

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('Site'), 'paris-dc1');

    expect(screen.getByLabelText('Machine class')).toBeDefined();
    expect(screen.getByRole('option', { name: /gpu-large.*3/i })).toBeDefined();
    expect(screen.getByRole('option', { name: /standard.*5/i })).toBeDefined();
  });

  // Story — machine type selector: "no machines" message when site has empty machineClasses
  it('shows a no-machines message when the selected site has no available classes', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('default')], null]);
    mockSiteUseList.mockReturnValue([[
      makeSiteConfig('lyon-dc2', []),
    ], null]);

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('Site'), 'lyon-dc2');

    expect(screen.getByTestId('no-machines-message')).toBeDefined();
    expect((screen.getByRole('button', { name: /create/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  // Story — machine type selector: submit disabled without machineClass
  it('disables submit when machineClass is not selected', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('default')], null]);
    mockSiteUseList.mockReturnValue([[
      makeSiteConfig('paris-dc1', [{ machineClass: 'standard', availableCount: 2 }]),
    ], null]);

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('AddonProfile'), 'default');
    await userEvent.selectOptions(screen.getByLabelText('Site'), 'paris-dc1');
    // do NOT select a machine class

    expect((screen.getByRole('button', { name: /create/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  // Story — machine type selector: incompatibility warning when AddonProfile requires tags
  it('shows an incompatibility warning when the selected class lacks required tags', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('gpu-compute', ['gpu'])], null]);
    mockSiteUseList.mockReturnValue([[
      makeSiteConfig('paris-dc1', [
        { machineClass: 'standard', availableCount: 5, tags: [] },
      ]),
    ], null]);

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('AddonProfile'), 'gpu-compute');
    await userEvent.selectOptions(screen.getByLabelText('Site'), 'paris-dc1');
    await userEvent.selectOptions(screen.getByLabelText('Machine class'), 'standard');

    expect(screen.getByTestId('machine-class-incompatibility')).toBeDefined();
    expect((screen.getByRole('button', { name: /create/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  // Story — machine type selector: no warning when class satisfies required tags
  it('does not show incompatibility when the selected class has all required tags', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('gpu-compute', ['gpu'])], null]);
    mockSiteUseList.mockReturnValue([[
      makeSiteConfig('paris-dc1', [
        { machineClass: 'gpu-large', availableCount: 2, tags: ['gpu'] },
      ]),
    ], null]);

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('AddonProfile'), 'gpu-compute');
    await userEvent.selectOptions(screen.getByLabelText('Site'), 'paris-dc1');
    await userEvent.selectOptions(screen.getByLabelText('Machine class'), 'gpu-large');

    expect(screen.queryByTestId('machine-class-incompatibility')).toBeNull();
    expect((screen.getByRole('button', { name: /create/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  // Story — machine type selector: machineClass included in create payload
  it('includes machineClass in the ClusterClaim spec on create', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('default')], null]);
    mockSiteUseList.mockReturnValue([[
      makeSiteConfig('paris-dc1', [{ machineClass: 'standard', availableCount: 2 }]),
    ], null]);
    mockCreate.mockResolvedValueOnce({});

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('AddonProfile'), 'default');
    await userEvent.selectOptions(screen.getByLabelText('Site'), 'paris-dc1');
    await userEvent.selectOptions(screen.getByLabelText('Machine class'), 'standard');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    expect(mockCreate).toHaveBeenCalledOnce();
    const [payload] = mockCreate.mock.calls[0];
    expect(payload.spec.machineClass).toBe('standard');
  });

  // Story — machine type selector: changing site resets machineClass
  it('resets machine class selection when site changes', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('default')], null]);
    mockSiteUseList.mockReturnValue([[
      makeSiteConfig('paris-dc1', [{ machineClass: 'gpu-large', availableCount: 2, tags: ['gpu'] }]),
      makeSiteConfig('lyon-dc2', [{ machineClass: 'standard', availableCount: 4 }]),
    ], null]);

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    // Select a site and a machine class on that site.
    await userEvent.selectOptions(screen.getByLabelText('Site'), 'paris-dc1');
    await userEvent.selectOptions(screen.getByLabelText('Machine class'), 'gpu-large');
    expect((screen.getByLabelText('Machine class') as HTMLSelectElement).value).toBe('gpu-large');

    // Switch to a different site — machine class must be reset to empty.
    await userEvent.selectOptions(screen.getByLabelText('Site'), 'lyon-dc2');
    expect((screen.getByLabelText('Machine class') as HTMLSelectElement).value).toBe('');
  });

  // Story — machine type selector: "pending sync" state shown when site has never been synced
  it('does not show "no machines" when site status has never been synced', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('default')], null]);
    // SiteConfig with no status.machineClasses at all (operator has not run yet).
    mockSiteUseList.mockReturnValue([[
      { jsonData: { metadata: { name: 'new-site' } } },
    ], null]);

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('Site'), 'new-site');

    // Must NOT show the "no machines" error — that implies synced-but-empty.
    expect(screen.queryByTestId('no-machines-message')).toBeNull();
    // Machine class selector must not appear either.
    expect(screen.queryByLabelText('Machine class')).toBeNull();
  });
});

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

function makeAddonProfile(name: string) {
  return { jsonData: { metadata: { name }, spec: { description: name } } };
}

function makeSiteConfig(name: string) {
  return { jsonData: { metadata: { name } } };
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
    mockSiteUseList.mockReturnValue([[makeSiteConfig('paris-dc1')], null]);
    mockCreate.mockRejectedValueOnce({ message: 'quota exceeded' });

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('AddonProfile'), 'default');
    await userEvent.selectOptions(screen.getByLabelText('Site'), 'paris-dc1');
    await userEvent.clear(screen.getByLabelText('Machine count'));
    await userEvent.type(screen.getByLabelText('Machine count'), '3');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(await screen.findByText(/quota exceeded/i)).toBeDefined();
  });

  // Story 6 — happy path: onSuccess called after successful create
  it('calls onSuccess with the cluster name after successful create', async () => {
    mockAddonUseList.mockReturnValue([[makeAddonProfile('default')], null]);
    mockSiteUseList.mockReturnValue([[makeSiteConfig('paris-dc1')], null]);
    mockCreate.mockResolvedValueOnce({});
    const onSuccess = vi.fn();

    render(<ClusterClaimForm namespace="tenant-acme" onSuccess={onSuccess} />);

    await userEvent.selectOptions(screen.getByLabelText('AddonProfile'), 'default');
    await userEvent.selectOptions(screen.getByLabelText('Site'), 'paris-dc1');
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
});

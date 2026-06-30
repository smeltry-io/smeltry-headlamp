// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  registerRoute: vi.fn(),
  registerSidebarEntry: vi.fn(),
}));

describe('smeltry-headlamp plugin registration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('registers top-level and child sidebar entries', async () => {
    const lib = await import('@kinvolk/headlamp-plugin/lib');
    await import('./index');

    expect(lib.registerSidebarEntry).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'smeltry' })
    );
    expect(lib.registerSidebarEntry).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'smeltry-clusters' })
    );
    expect(lib.registerSidebarEntry).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'smeltry-servers' })
    );
  });

  it('registers a route for the top-level smeltry sidebar entry', async () => {
    const lib = await import('@kinvolk/headlamp-plugin/lib');
    await import('./index');

    expect(lib.registerRoute).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/smeltry', name: 'SmeltryHome' })
    );
  });

  it('registers cluster list and detail routes', async () => {
    const lib = await import('@kinvolk/headlamp-plugin/lib');
    await import('./index');

    expect(lib.registerRoute).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/smeltry/clusters', name: 'SmeltryClusterList' })
    );
    expect(lib.registerRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/smeltry/clusters/:namespace/:name',
        name: 'SmeltryClusterDetail',
      })
    );
  });

  it('registers server list route', async () => {
    const lib = await import('@kinvolk/headlamp-plugin/lib');
    await import('./index');

    expect(lib.registerRoute).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/smeltry/servers', name: 'SmeltryServerList' })
    );
  });
});

// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { SiteConfigClass } from '../crd';

interface SiteConfigItem {
  jsonData: {
    metadata: { name: string; namespace: string };
    spec: {
      network?: { provisioningCIDR?: string };
      dns?: { zone?: string };
      cilium?: { l2PoolName?: string };
    };
  };
}

export function AdminSiteConfigList() {
  const [sites, error] = SiteConfigClass.useList({ namespace: 'portal-system' });

  if (error) {
    return (
      <CommonComponents.SectionBox title="Sites">
        <div role="alert">{error.message}</div>
      </CommonComponents.SectionBox>
    );
  }

  if (sites === null) {
    return (
      <CommonComponents.SectionBox title="Sites">
        <div>Loading…</div>
      </CommonComponents.SectionBox>
    );
  }

  return (
    <CommonComponents.SectionBox title="Sites">
      {sites.length === 0 ? (
        <div>No sites</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Provisioning CIDR</th>
              <th>DNS Zone</th>
              <th>L2 Pool</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s: SiteConfigItem) => (
              <tr key={s.jsonData.metadata.name} data-testid="siteconfig-row">
                <td>{s.jsonData.metadata.name}</td>
                <td>{s.jsonData.spec?.network?.provisioningCIDR ?? '—'}</td>
                <td>{s.jsonData.spec?.dns?.zone ?? '—'}</td>
                <td>{s.jsonData.spec?.cilium?.l2PoolName ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CommonComponents.SectionBox>
  );
}

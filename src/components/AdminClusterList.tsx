// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import React, { useState } from 'react';
import { ClusterClaimClass } from '../crd';

interface ClusterClaimItem {
  jsonData: {
    metadata: { name: string; namespace: string };
    spec: { site: string; machineCount: number };
    status: { phase: string };
  };
}

export function AdminClusterList() {
  const [clusters, error] = ClusterClaimClass.useList({ namespace: '' });
  const [tenantFilter, setTenantFilter] = useState('');

  if (error) {
    return (
      <CommonComponents.SectionBox title="All Clusters">
        <div role="alert">{error.message}</div>
      </CommonComponents.SectionBox>
    );
  }

  if (clusters === null) {
    return (
      <CommonComponents.SectionBox title="All Clusters">
        <div>Loading…</div>
      </CommonComponents.SectionBox>
    );
  }

  const filtered = tenantFilter
    ? clusters.filter((c: ClusterClaimItem) =>
        c.jsonData.metadata.namespace.includes(tenantFilter)
      )
    : clusters;

  return (
    <CommonComponents.SectionBox title="All Clusters">
      <input
        placeholder="Filter by tenant…"
        value={tenantFilter}
        onChange={e => setTenantFilter(e.target.value)}
      />
      {filtered.length === 0 ? (
        <div>No clusters</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Name</th>
              <th>Phase</th>
              <th>Site</th>
              <th>Nodes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: ClusterClaimItem) => (
              <tr
                key={`${c.jsonData.metadata.namespace}/${c.jsonData.metadata.name}`}
                data-testid="admin-cluster-row"
              >
                <td>{c.jsonData.metadata.namespace}</td>
                <td>{c.jsonData.metadata.name}</td>
                <td>{c.jsonData.status?.phase ?? '—'}</td>
                <td>{c.jsonData.spec?.site ?? '—'}</td>
                <td>{c.jsonData.spec?.machineCount ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CommonComponents.SectionBox>
  );
}

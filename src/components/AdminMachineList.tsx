// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import React, { useState } from 'react';
import { ServerClaimClass } from '../crd';

interface ServerClaimItem {
  jsonData: {
    metadata: { name: string; namespace: string };
    spec: { site: string; machineClass: string; os: string };
    status: { phase: string; serverIP: string };
  };
}

const DEGRADED_PHASES = new Set(['Failed']);

export function AdminMachineList() {
  const [servers, error] = ServerClaimClass.useList({ namespace: '' });
  const [siteFilter, setSiteFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  if (error) {
    return (
      <CommonComponents.SectionBox title="All Machines">
        <div role="alert">{error.message}</div>
      </CommonComponents.SectionBox>
    );
  }

  if (servers === null) {
    return (
      <CommonComponents.SectionBox title="All Machines">
        <div>Loading…</div>
      </CommonComponents.SectionBox>
    );
  }

  const filtered = servers.filter((s: ServerClaimItem) => {
    const site = s.jsonData.spec?.site ?? '';
    const cls = s.jsonData.spec?.machineClass ?? '';
    const phase = s.jsonData.status?.phase ?? '';
    return (
      site.includes(siteFilter) &&
      cls.includes(classFilter) &&
      phase.includes(statusFilter)
    );
  });

  const hasActiveFilter = siteFilter || classFilter || statusFilter;

  return (
    <CommonComponents.SectionBox title="All Machines">
      <input
        placeholder="Filter by site…"
        value={siteFilter}
        onChange={e => setSiteFilter(e.target.value)}
      />
      <input
        placeholder="Filter by class…"
        value={classFilter}
        onChange={e => setClassFilter(e.target.value)}
      />
      <input
        placeholder="Filter by status…"
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value)}
      />
      {servers.length === 0 ? (
        <div>No machines</div>
      ) : filtered.length === 0 ? (
        <div>{hasActiveFilter ? 'No machines match the current filters' : 'No machines'}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Name</th>
              <th>Phase</th>
              <th>Site</th>
              <th>Class</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s: ServerClaimItem) => {
              const phase = s.jsonData.status?.phase ?? '';
              return (
                <tr
                  key={`${s.jsonData.metadata.namespace}/${s.jsonData.metadata.name}`}
                  data-testid="admin-machine-row"
                  data-degraded={String(DEGRADED_PHASES.has(phase))}
                >
                  <td>{s.jsonData.metadata.namespace}</td>
                  <td>{s.jsonData.metadata.name}</td>
                  <td>{phase || '—'}</td>
                  <td>{s.jsonData.spec?.site ?? '—'}</td>
                  <td>{s.jsonData.spec?.machineClass ?? '—'}</td>
                  <td>{s.jsonData.status?.serverIP || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </CommonComponents.SectionBox>
  );
}

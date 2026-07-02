// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { ServerClaimClass } from '../crd';

interface ServerClaimItem {
  jsonData: {
    metadata: { name: string; namespace: string };
    spec: { site: string; machineClass: string; os: string };
    status: { phase: string; serverIP: string };
  };
}

const DEGRADED_PHASES = new Set(['Failed']);

function csvField(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function exportCSV(servers: ServerClaimItem[]) {
  const header = 'tenant,name,phase,site,class,ip';
  const rows = servers.map(s => {
    const { namespace, name } = s.jsonData.metadata;
    const { site, machineClass } = s.jsonData.spec ?? {};
    const { phase, serverIP } = s.jsonData.status ?? {};
    return [namespace, name, phase ?? '', site ?? '', machineClass ?? '', serverIP ?? '']
      .map(csvField)
      .join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'machine-health.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function MachineHealth() {
  const [servers, error] = ServerClaimClass.useList({ namespace: '' });

  if (error) {
    return (
      <CommonComponents.SectionBox title="Machine Health">
        <div role="alert">{error.message}</div>
      </CommonComponents.SectionBox>
    );
  }

  if (servers === null) {
    return (
      <CommonComponents.SectionBox title="Machine Health">
        <div>Loading…</div>
      </CommonComponents.SectionBox>
    );
  }

  const degradedCount = servers.filter(
    (s: ServerClaimItem) => DEGRADED_PHASES.has(s.jsonData.status?.phase ?? '')
  ).length;

  return (
    <CommonComponents.SectionBox title="Machine Health">
      <div>
        {servers.length > 0 && (
          degradedCount > 0 ? (
            <span>{degradedCount} degraded</span>
          ) : (
            <span>All healthy</span>
          )
        )}
        <button onClick={() => exportCSV(servers)}>Export</button>
      </div>
      {servers.length === 0 ? (
        <div>No machines</div>
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
            {servers.map((s: ServerClaimItem) => {
              const phase = s.jsonData.status?.phase ?? '';
              return (
                <tr
                  key={`${s.jsonData.metadata.namespace}/${s.jsonData.metadata.name}`}
                  data-testid="machine-health-row"
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

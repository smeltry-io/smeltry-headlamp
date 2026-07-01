// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import React, { useState } from 'react';
import { AuditEventClass } from '../crd';

const EVENT_TYPES = ['', 'PhaseChanged', 'MachineAllocated', 'IPAllocated', 'ClusterDeleted', 'ServerDeleted'];

interface AuditEventItem {
  jsonData: {
    metadata: { name: string; namespace: string };
    spec: {
      type: string;
      resourceName: string;
      actor: string;
      timestamp: string;
    };
  };
}

export function AdminAuditEventList() {
  // Empty string = all namespaces (cluster-wide list)
  const [events, error] = AuditEventClass.useList({ namespace: '' });
  const [tenantFilter, setTenantFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');

  if (error) {
    return (
      <CommonComponents.SectionBox title="Global Audit Log">
        <div role="alert">{error.message}</div>
      </CommonComponents.SectionBox>
    );
  }

  const filtered = events
    ? (events as AuditEventItem[])
        .filter(ev => !tenantFilter || ev.jsonData?.metadata?.namespace?.includes(tenantFilter))
        .filter(ev => !typeFilter || ev.jsonData?.spec?.type === typeFilter)
        .filter(ev => {
          if (!fromDate) return true;
          // ISO 8601 timestamps are lexicographically sortable; fromDate is YYYY-MM-DD
          // which is a valid prefix for comparison as long as timestamps are UTC.
          return ev.jsonData?.spec?.timestamp >= fromDate;
        })
        .sort((a, b) => {
          const tA = a.jsonData?.spec?.timestamp ?? '';
          const tB = b.jsonData?.spec?.timestamp ?? '';
          return tB.localeCompare(tA);
        })
    : null;

  return (
    <CommonComponents.SectionBox title="Global Audit Log">
      <div>
        <input
          placeholder="Filter by tenant…"
          value={tenantFilter}
          onChange={e => setTenantFilter(e.target.value)}
        />
        <label>
          Event type
          <select
            aria-label="Event type"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>
                {t || 'All types'}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            aria-label="From"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
        </label>
      </div>
      {filtered === null ? (
        <div>Loading…</div>
      ) : filtered.length === 0 ? (
        <div>No audit events</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Type</th>
              <th>Resource</th>
              <th>Actor</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev: AuditEventItem) => (
              <tr key={ev.jsonData.metadata.name} data-testid="admin-audit-row">
                <td>{ev.jsonData.metadata.namespace}</td>
                <td>{ev.jsonData.spec.type}</td>
                <td>{ev.jsonData.spec.resourceName}</td>
                <td>{ev.jsonData.spec.actor}</td>
                <td>{ev.jsonData.spec.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CommonComponents.SectionBox>
  );
}

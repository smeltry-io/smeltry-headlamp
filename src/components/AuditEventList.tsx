// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import React, { useState } from 'react';
import { AuditEventClass } from '../crd';

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

export function AuditEventList() {
  const [events, error] = AuditEventClass.useList();
  const [filter, setFilter] = useState('');

  if (error) {
    return (
      <CommonComponents.SectionBox title="Audit History">
        <div role="alert">{error.message}</div>
      </CommonComponents.SectionBox>
    );
  }

  const filtered = events
    ? events.filter((ev: AuditEventItem) =>
        ev.jsonData?.spec?.resourceName?.includes(filter)
      )
    : null;

  return (
    <CommonComponents.SectionBox title="Audit History">
      <input
        placeholder="Filter by resource…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      {filtered === null ? (
        <div>Loading…</div>
      ) : filtered.length === 0 ? (
        <div>No audit events</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Resource</th>
              <th>Actor</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev: AuditEventItem) => (
              <tr key={ev.jsonData.metadata.name} data-testid="audit-row">
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

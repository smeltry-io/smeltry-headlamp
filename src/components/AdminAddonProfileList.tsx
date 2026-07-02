// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { AddonProfileClass } from '../crd';

interface Component {
  name: string;
  required: boolean;
  order: number;
}

interface AddonProfileItem {
  jsonData: {
    metadata: { name: string; namespace: string };
    spec: {
      description?: string;
      components?: Component[];
    };
  };
}

export function AdminAddonProfileList() {
  const [profiles, error] = AddonProfileClass.useList({ namespace: 'portal-system' });

  if (error) {
    return (
      <CommonComponents.SectionBox title="Addon Profiles">
        <div role="alert">{error.message}</div>
      </CommonComponents.SectionBox>
    );
  }

  if (profiles === null) {
    return (
      <CommonComponents.SectionBox title="Addon Profiles">
        <div>Loading…</div>
      </CommonComponents.SectionBox>
    );
  }

  return (
    <CommonComponents.SectionBox title="Addon Profiles">
      {profiles.length === 0 ? (
        <div>No addon profiles</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Components</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p: AddonProfileItem) => {
              const components = p.jsonData.spec?.components ?? [];
              const sorted = [...components].sort((a, b) => a.order - b.order);
              return (
                <tr key={p.jsonData.metadata.name} data-testid="addonprofile-row">
                  <td>{p.jsonData.metadata.name}</td>
                  <td>{p.jsonData.spec?.description ?? '—'}</td>
                  <td>
                    {components.length} — {sorted.map(c => c.name).join(', ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </CommonComponents.SectionBox>
  );
}

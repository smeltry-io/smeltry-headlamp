// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import React from 'react';
import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import { ClusterClaimClass } from '../crd';

export function ClusterClaimList() {
  const [claims, error] = ClusterClaimClass.useList();

  return (
    <CommonComponents.SectionBox title="Clusters">
      <CommonComponents.ResourceTable
        data={claims}
        errorMessage={error?.message ?? null}
        columns={[
          'name',
          'namespace',
          {
            label: 'Phase',
            getValue: (item: any) => item.jsonData?.status?.phase ?? '—',
          },
          {
            label: 'Site',
            getValue: (item: any) => item.jsonData?.spec?.site ?? '—',
          },
          {
            label: 'Nodes',
            getValue: (item: any) => item.jsonData?.spec?.machineCount ?? '—',
          },
          'age',
        ]}
      />
    </CommonComponents.SectionBox>
  );
}

// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { ClusterClaimClass } from '../crd';

// Minimal shape of a ClusterClaim object as returned by the kube-apiserver.
// Only the fields rendered in this list view are declared; other fields are
// intentionally omitted to avoid coupling to the full CRD schema here.
interface ClusterClaimItem {
  jsonData: {
    metadata: { name: string; namespace: string };
    spec: { site: string; machineCount: number };
    status: { phase: string };
  };
}

// Columns are defined outside the component so the array reference is stable
// across re-renders and ResourceTable can safely memoise column definitions.
//
// The 'namespace' built-in column is intentionally omitted: tenants operate
// within a single namespace, so displaying it adds noise without value.
// The admin multi-namespace view (Epic 6, story "Vue admin clusters") will
// use a separate component where the namespace column is relevant.
const CLUSTER_COLUMNS = [
  'name' as const,
  {
    label: 'Phase',
    getValue: (item: ClusterClaimItem) => item.jsonData?.status?.phase ?? '—',
  },
  {
    label: 'Site',
    getValue: (item: ClusterClaimItem) => item.jsonData?.spec?.site ?? '—',
  },
  {
    label: 'Nodes',
    getValue: (item: ClusterClaimItem) => item.jsonData?.spec?.machineCount ?? '—',
  },
  'age' as const,
];

export function ClusterClaimList() {
  const [claims, error] = ClusterClaimClass.useList();

  return (
    <CommonComponents.SectionBox title="Clusters">
      <CommonComponents.ResourceTable
        data={claims}
        errorMessage={error?.message ?? null}
        columns={CLUSTER_COLUMNS}
      />
    </CommonComponents.SectionBox>
  );
}

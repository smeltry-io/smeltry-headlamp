// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import { ClusterClaimDetail } from './components/ClusterClaimDetail';
import { ClusterClaimList } from './components/ClusterClaimList';

registerSidebarEntry({
  parent: null,
  name: 'smeltry',
  label: 'Smeltry',
  url: '/smeltry',
  icon: 'mdi:server-network',
});

registerSidebarEntry({
  parent: 'smeltry',
  name: 'smeltry-clusters',
  label: 'Clusters',
  url: '/smeltry/clusters',
  icon: 'mdi:server',
});

registerSidebarEntry({
  parent: 'smeltry',
  name: 'smeltry-servers',
  label: 'Servers',
  url: '/smeltry/servers',
  icon: 'mdi:desktop-tower',
});

registerRoute({
  path: '/smeltry',
  sidebar: 'smeltry',
  name: 'SmeltryHome',
  component: () => null,
});

registerRoute({
  path: '/smeltry/clusters',
  sidebar: 'smeltry-clusters',
  name: 'SmeltryClusterList',
  component: () => <ClusterClaimList />,
});

registerRoute({
  path: '/smeltry/clusters/:namespace/:name',
  sidebar: 'smeltry-clusters',
  name: 'SmeltryClusterDetail',
  component: ({ match }: { match: { params: { namespace: string; name: string } } }) => (
    <ClusterClaimDetail name={match.params.name} namespace={match.params.namespace} />
  ),
});

registerRoute({
  path: '/smeltry/servers',
  sidebar: 'smeltry-servers',
  name: 'SmeltryServerList',
  component: () => null,
});

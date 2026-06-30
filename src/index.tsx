// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import React from 'react';
import { registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
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
  component: () => null,
});

registerRoute({
  path: '/smeltry/servers',
  sidebar: 'smeltry-servers',
  name: 'SmeltryServerList',
  component: () => null,
});

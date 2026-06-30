// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { K8s } from '@kinvolk/headlamp-plugin/lib';

export const ClusterClaimClass = K8s.crd.makeCustomResourceClass({
  apiInfo: [{ group: 'portal.smeltry.io', version: 'v1alpha1' }],
  kind: 'ClusterClaim',
  pluralName: 'clusterclaims',
  singularName: 'clusterclaim',
  isNamespaced: true,
});

export const ServerClaimClass = K8s.crd.makeCustomResourceClass({
  apiInfo: [{ group: 'portal.smeltry.io', version: 'v1alpha1' }],
  kind: 'ServerClaim',
  pluralName: 'serverclaims',
  singularName: 'serverclaim',
  isNamespaced: true,
});

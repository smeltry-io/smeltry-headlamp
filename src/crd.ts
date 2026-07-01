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

// AddonProfile and SiteConfig live in portal-system and are readable by all
// authenticated tenants via the smeltry-catalog-reader ClusterRole.
export const AddonProfileClass = K8s.crd.makeCustomResourceClass({
  apiInfo: [{ group: 'portal.smeltry.io', version: 'v1alpha1' }],
  kind: 'AddonProfile',
  pluralName: 'addonprofiles',
  singularName: 'addonprofile',
  isNamespaced: true,
});

export const SiteConfigClass = K8s.crd.makeCustomResourceClass({
  apiInfo: [{ group: 'portal.smeltry.io', version: 'v1alpha1' }],
  kind: 'SiteConfig',
  pluralName: 'siteconfigs',
  singularName: 'siteconfig',
  isNamespaced: true,
});

export const AuditEventClass = K8s.crd.makeCustomResourceClass({
  apiInfo: [{ group: 'portal.smeltry.io', version: 'v1alpha1' }],
  kind: 'AuditEvent',
  pluralName: 'auditevents',
  singularName: 'auditevent',
  isNamespaced: true,
});

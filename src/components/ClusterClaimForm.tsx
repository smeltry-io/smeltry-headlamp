// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import React, { useState } from 'react';
import { AddonProfileClass, ClusterClaimClass, SiteConfigClass } from '../crd';

const PORTAL_SYSTEM = 'portal-system';

// Kubernetes DNS-1123 label: lowercase alphanumeric and hyphens, max 63 chars.
function toDNS1123(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52);
}

interface MachineClassSummary {
  machineClass: string;
  availableCount: number;
  tags?: string[];
}

interface Props {
  namespace: string;
  onSuccess: (name: string) => void;
}

export function ClusterClaimForm({ namespace, onSuccess }: Props) {
  const [addonProfiles] = AddonProfileClass.useList({ namespace: PORTAL_SYSTEM });
  const [siteConfigs] = SiteConfigClass.useList({ namespace: PORTAL_SYSTEM });

  const [addonProfile, setAddonProfile] = useState('');
  const [site, setSite] = useState('');
  const [machineClass, setMachineClass] = useState('');
  const [machineCount, setMachineCount] = useState<number | ''>(1);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Derive machine classes for the currently selected site from its status.
  const selectedSiteConfig = (siteConfigs ?? []).find(
    (s: any) => s.jsonData.metadata.name === site
  );
  const siteHasBeenSynced = site !== '' && selectedSiteConfig !== undefined;
  const machineClasses: MachineClassSummary[] =
    selectedSiteConfig?.jsonData?.status?.machineClasses ?? [];

  // Derive required tags from the selected AddonProfile's machineConstraints.
  const selectedAddonProfile = (addonProfiles ?? []).find(
    (p: any) => p.jsonData.metadata.name === addonProfile
  );
  const requiredTags: string[] =
    selectedAddonProfile?.jsonData?.spec?.machineConstraints?.requiredTags ?? [];

  // Check if the chosen class satisfies the AddonProfile tag constraints.
  const selectedClassSummary = machineClasses.find(mc => mc.machineClass === machineClass);
  const classTags: string[] = selectedClassSummary?.tags ?? [];
  const isIncompatible =
    machineClass !== '' &&
    requiredTags.length > 0 &&
    requiredTags.some(tag => !classTags.includes(tag));

  const isValid =
    addonProfile !== '' &&
    site !== '' &&
    machineClass !== '' &&
    !isIncompatible &&
    machineClasses.length > 0 &&
    typeof machineCount === 'number' &&
    machineCount > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setApiError(null);
    setSubmitting(true);

    try {
      const name = `${toDNS1123(addonProfile)}-${Date.now()}`;
      await (ClusterClaimClass as any).create(
        {
          apiVersion: 'portal.smeltry.io/v1alpha1',
          kind: 'ClusterClaim',
          metadata: { name, namespace },
          spec: { addonProfile, site, machineClass, machineCount },
        },
        namespace
      );
      onSuccess(name);
    } catch (err: any) {
      setApiError(err?.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CommonComponents.SectionBox title="Create cluster">
      <form onSubmit={handleSubmit}>
        {apiError && <div role="alert">{apiError}</div>}

        <label htmlFor="addonProfile">AddonProfile</label>
        <select
          id="addonProfile"
          value={addonProfile}
          onChange={e => setAddonProfile(e.target.value)}
        >
          <option value="">— select —</option>
          {(addonProfiles ?? []).map((p: any) => (
            <option key={p.jsonData.metadata.name} value={p.jsonData.metadata.name}>
              {p.jsonData.metadata.name}
            </option>
          ))}
        </select>

        <label htmlFor="site">Site</label>
        <select
          id="site"
          value={site}
          onChange={e => {
            setSite(e.target.value);
            setMachineClass(''); // reset when site changes
          }}
        >
          <option value="">— select —</option>
          {(siteConfigs ?? []).map((s: any) => (
            <option key={s.jsonData.metadata.name} value={s.jsonData.metadata.name}>
              {s.jsonData.metadata.name}
            </option>
          ))}
        </select>

        {siteHasBeenSynced && machineClasses.length === 0 && (
          <p data-testid="no-machines-message">
            No machines available on this site.
          </p>
        )}

        {machineClasses.length > 0 && (
          <>
            <label htmlFor="machineClass">Machine class</label>
            <select
              id="machineClass"
              value={machineClass}
              onChange={e => setMachineClass(e.target.value)}
            >
              <option value="">— select —</option>
              {machineClasses.map(mc => (
                <option key={mc.machineClass} value={mc.machineClass}>
                  {mc.machineClass} ({mc.availableCount} available)
                </option>
              ))}
            </select>

            {isIncompatible && (
              <p data-testid="machine-class-incompatibility">
                This machine class is incompatible with the selected AddonProfile —
                required tags missing: {requiredTags.filter(t => !classTags.includes(t)).join(', ')}.
              </p>
            )}
          </>
        )}

        <label htmlFor="machineCount">Machine count</label>
        <input
          id="machineCount"
          type="number"
          min={1}
          value={machineCount}
          onChange={e => setMachineCount(e.target.value === '' ? '' : Number(e.target.value))}
        />

        <button type="submit" disabled={!isValid || submitting}>
          Create cluster
        </button>
      </form>
    </CommonComponents.SectionBox>
  );
}

// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import React, { useState } from 'react';
import { ClusterClaimClass } from '../crd';

interface ClusterClaimStatus {
  phase: string;
  controlPlaneIP?: string;
  controlPlaneDNS?: string;
  webhookIP?: string;
  webhookDNS?: string;
  kubeconfigSecret?: string;
  conditions?: unknown[];
}

interface ClusterClaimDetailItem {
  jsonData: {
    metadata: { name: string; namespace: string };
    spec: { site: string; machineCount: number; addonProfile: string };
    status: ClusterClaimStatus;
  };
}

// Scale and delete actions are only safe once the cluster is fully Ready.
// In any other phase the action buttons are replaced by this notice.
function ActionsDisabledNotice({ phase }: { phase: string }) {
  return (
    <p data-testid="actions-disabled-notice">
      Actions unavailable — cluster is in phase <strong>{phase}</strong>.
    </p>
  );
}

interface Props {
  name: string;
  namespace: string;
}

export function ClusterClaimDetail({ name, namespace }: Props) {
  const [claim, error] = ClusterClaimClass.useGet(name, namespace);
  const [scaling, setScaling] = useState(false);
  const [scaleCount, setScaleCount] = useState<number | ''>(1);
  const [scaleError, setScaleError] = useState<string | null>(null);

  if (error) {
    return <div role="alert">{error.message}</div>;
  }

  if (!claim) {
    return <div>Loading…</div>;
  }

  const item = claim as ClusterClaimDetailItem;
  const { status, spec } = item.jsonData;
  const isReady = status.phase === 'Ready';

  async function handleScale(e: React.FormEvent) {
    e.preventDefault();
    if (typeof scaleCount !== 'number' || scaleCount < 1) return;
    setScaleError(null);
    try {
      await (ClusterClaimClass as any).patch(item, { spec: { machineCount: scaleCount } });
      setScaling(false);
    } catch (err: any) {
      setScaleError(err?.message ?? 'Unknown error');
    }
  }

  return (
    <CommonComponents.SectionBox title={name}>
      <dl>
        <dt>Phase</dt>
        <dd>{status.phase}</dd>

        {status.controlPlaneIP && (
          <>
            <dt>Control plane IP</dt>
            <dd>{status.controlPlaneIP}</dd>
          </>
        )}

        {status.controlPlaneDNS && (
          <>
            <dt>Control plane DNS</dt>
            <dd>{status.controlPlaneDNS}</dd>
          </>
        )}

        {status.webhookIP && (
          <>
            <dt>Webhook IP</dt>
            <dd>{status.webhookIP}</dd>
          </>
        )}

        {status.webhookDNS && (
          <>
            <dt>Webhook DNS</dt>
            <dd>{status.webhookDNS}</dd>
          </>
        )}
      </dl>

      {isReady ? (
        <>
          {!scaling && (
            <button
              onClick={() => {
                setScaleCount(spec.machineCount);
                setScaling(true);
              }}
            >
              Scale
            </button>
          )}

          {scaling && (
            <form onSubmit={handleScale}>
              {scaleError && <div role="alert">{scaleError}</div>}
              <label htmlFor="scaleCount">Machine count</label>
              <input
                id="scaleCount"
                type="number"
                min={1}
                value={scaleCount}
                onChange={e => setScaleCount(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <button type="submit">Apply</button>
              <button type="button" onClick={() => setScaling(false)}>
                Cancel
              </button>
            </form>
          )}
        </>
      ) : (
        <ActionsDisabledNotice phase={status.phase} />
      )}
    </CommonComponents.SectionBox>
  );
}

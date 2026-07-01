// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents, K8s } from '@kinvolk/headlamp-plugin/lib';
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

const DELETE_AT_ANNOTATION = 'portal.smeltry.io/delete-at';
// Grace period before a cluster is actually deleted: 1 hour.
const DELETE_GRACE_MS = 60 * 60 * 1000;

interface ClusterClaimDetailItem {
  jsonData: {
    metadata: { name: string; namespace: string; annotations?: Record<string, string> };
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
  // onDeleted is kept for future use when actual deletion occurs after grace period
  onDeleted?: () => void;
}

export function ClusterClaimDetail({ name, namespace }: Props) {
  const [claim, error] = ClusterClaimClass.useGet(name, namespace);

  // kubeconfigSecret name is only known once the claim is loaded; we pass ''
  // until then so the hook is called unconditionally (rules of hooks).
  const secretName =
    (claim as ClusterClaimDetailItem | null)?.jsonData?.status?.kubeconfigSecret ?? '';
  const [kubeSecret] = (K8s.Secret as any).useGet(secretName || null, namespace);

  const [scaling, setScaling] = useState(false);
  const [scaleCount, setScaleCount] = useState<number | ''>(1);
  const [scaleError, setScaleError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (error) {
    return <div role="alert">{error.message}</div>;
  }

  if (!claim) {
    return <div>Loading…</div>;
  }

  const item = claim as ClusterClaimDetailItem;
  const { status, spec } = item.jsonData;
  const isReady = status.phase === 'Ready';
  const deleteAt = item.jsonData.metadata.annotations?.[DELETE_AT_ANNOTATION];
  const pendingDeletion = Boolean(deleteAt);

  async function handleScheduleDelete() {
    setDeleteError(null);
    try {
      const expiry = new Date(Date.now() + DELETE_GRACE_MS).toISOString();
      await (ClusterClaimClass as any).patch(item, {
        metadata: { annotations: { [DELETE_AT_ANNOTATION]: expiry } },
      });
      setConfirmDelete(false);
    } catch (err: any) {
      setDeleteError(err?.message ?? 'Unknown error');
    }
  }

  async function handleCancelDelete() {
    try {
      // null removes the annotation via strategic merge patch
      await (ClusterClaimClass as any).patch(item, {
        metadata: { annotations: { [DELETE_AT_ANNOTATION]: null } },
      });
    } catch {
      // ignore — UI will refresh via useGet
    }
  }

  function handleDownloadKubeconfig() {
    const raw = kubeSecret?.jsonData?.data?.value;
    if (!raw) return;
    const yaml = atob(raw);
    const blob = new Blob([yaml], { type: 'application/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-kubeconfig.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

      {pendingDeletion && (
        <div data-testid="deletion-banner" role="alert">
          Deletion scheduled — cluster will be removed at {deleteAt}.
          <button onClick={handleCancelDelete}>Cancel deletion</button>
        </div>
      )}

      {isReady ? (
        <>
          {/* Scale and Delete panels are mutually exclusive: opening one hides
              the other. If Scale is open the Delete button is not visible —
              the user must cancel Scale first. Acceptable UX for v1. */}
          {!scaling && !confirmDelete && !pendingDeletion && (
            <>
              <button
                onClick={() => {
                  setScaleCount(spec.machineCount);
                  setScaling(true);
                }}
              >
                Scale
              </button>
              <button onClick={() => setConfirmDelete(true)}>Delete</button>
              {/* kubeconfigSecret is set in status once the cluster reaches Ready
                  and the operator has written the secret. The button is hidden
                  (not disabled) when the secret name is absent. */}
              {status.kubeconfigSecret && (
                <button onClick={handleDownloadKubeconfig}>Download kubeconfig</button>
              )}
            </>
          )}

          {confirmDelete && (
            <div>
              {deleteError && <div role="alert">{deleteError}</div>}
              <p>
                Delete cluster <strong>{item.jsonData.metadata.name}</strong>? This action cannot be
                undone.
              </p>
              <button onClick={handleScheduleDelete}>Confirm</button>
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteError(null);
                }}
              >
                Cancel
              </button>
            </div>
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

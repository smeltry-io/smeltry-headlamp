// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 The Smeltry Authors

import { CommonComponents } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
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

  if (error) {
    return <div role="alert">{error.message}</div>;
  }

  if (!claim) {
    return <div>Loading…</div>;
  }

  const { status } = (claim as ClusterClaimDetailItem).jsonData;
  const isReady = status.phase === 'Ready';

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

      {isReady ? null : <ActionsDisabledNotice phase={status.phase} />}
    </CommonComponents.SectionBox>
  );
}

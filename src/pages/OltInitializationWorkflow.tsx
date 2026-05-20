import React, { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import Layout from '../components/Layout.tsx';
import WorkflowInstance from '../components/WorkflowInstance.tsx';
import { oltRenderedConfigurations, olts, workflows } from '../services/api.ts';

const OltInitializationWorkflow: React.FC = () => {
  const { id = '', instanceId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: olt } = useQuery(['workflow-olt', id], () => olts.getById(id), { enabled: Boolean(id) });

  const { data: instance, isLoading, isError } = useQuery(
    ['workflow-instance', instanceId],
    () => workflows.getInstance(instanceId),
    { enabled: Boolean(instanceId), refetchInterval: 3000 }
  );

  const { data: renderedConfigs } = useQuery(
    ['workflow-rendered-configs', id],
    () => oltRenderedConfigurations.getAll({ page: 1, size: 1000, q: `olt_id:${id}` }),
    { enabled: Boolean(id) }
  );

  const renderedConfigByName = useMemo(() => {
    const map: Record<string, string> = {};
    (renderedConfigs?.data || []).forEach((item: any) => {
      map[item.name] = item.configuration;
    });
    return map;
  }, [renderedConfigs]);

  const manualMutation = useMutation(
    ({ actionCode, success, note }: { actionCode: string; success: boolean; note?: string }) =>
      workflows.completeManualAction(instanceId, actionCode, success, note),
    {
      onSuccess: () => queryClient.invalidateQueries(['workflow-instance', instanceId]),
    }
  );

  const retryMutation = useMutation(
    (actionCode: string) => workflows.retryAutomaticAction(instanceId, actionCode),
    {
      onSuccess: () => queryClient.invalidateQueries(['workflow-instance', instanceId]),
    }
  );

  const stopMutation = useMutation(
    () => workflows.stopInstance(instanceId, 'Stopped by operator from zadmin'),
    {
      onSuccess: () => queryClient.invalidateQueries(['workflow-instance', instanceId]),
    }
  );

  if (isLoading) {
    return (
      <Layout title="OLT Initialization Workflow">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="OLT Initialization Workflow">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={() => navigate('/olts')}>Back</Button>
        {instance?.status === 'RUNNING' && (
          <Button variant="outlined" color="error" onClick={() => stopMutation.mutate()}>
            Stop Workflow
          </Button>
        )}
      </Stack>

      <Typography variant="h6" sx={{ mb: 1 }}>{olt?.name || `OLT #${id}`}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Instance ID: {instanceId}</Typography>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Unable to load workflow instance.</Alert>}
      {manualMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Manual task update failed.</Alert>}
      {retryMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Retry failed.</Alert>}
      {stopMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Stop failed.</Alert>}

      <Box sx={{ opacity: manualMutation.isLoading || retryMutation.isLoading || stopMutation.isLoading ? 0.65 : 1 }}>
        <WorkflowInstance
          instance={instance}
          readOnly={instance?.status !== 'RUNNING'}
          renderedConfigByName={renderedConfigByName}
          onManualAction={async (actionCode, success, note) => {
            await manualMutation.mutateAsync({ actionCode, success, note });
          }}
          onRetryAutomatic={async (actionCode) => {
            await retryMutation.mutateAsync(actionCode);
          }}
        />
      </Box>
    </Layout>
  );
};

export default OltInitializationWorkflow;

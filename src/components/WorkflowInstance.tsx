import React, { useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';

interface WorkflowInstanceProps {
  instance: any;
  readOnly?: boolean;
  renderedConfigByName?: Record<string, string>;
  onManualAction?: (actionCode: string, success: boolean, note?: string) => Promise<void>;
  onRetryAutomatic?: (actionCode: string) => Promise<void>;
}

const statusColor = (status: string) => {
  if (status === 'COMPLETED' || status === 'SUCCESS') return 'success';
  if (status === 'FAILED' || status === 'STOPPED') return 'error';
  if (status === 'RUNNING') return 'warning';
  return 'default';
};

const WorkflowInstance: React.FC<WorkflowInstanceProps> = ({
  instance,
  readOnly = false,
  renderedConfigByName = {},
  onManualAction,
  onRetryAutomatic,
}) => {
  const [noteByAction, setNoteByAction] = useState<Record<string, string>>({});
  const [visibleConfigByAction, setVisibleConfigByAction] = useState<Record<string, boolean>>({});

  const progress = useMemo(() => {
    const actions = instance?.actions || [];
    if (!actions.length) return 0;
    const completed = actions.filter((a: any) => a.state === 'COMPLETED').length;
    return Math.round((completed / actions.length) * 100);
  }, [instance]);

  if (!instance) {
    return <Alert severity="info">No workflow instance loaded.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1}>
          <Typography variant="h6">{instance.workflow_type}</Typography>
          <Chip size="small" label={instance.status} color={statusColor(instance.status) as any} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Started at: {new Date(instance.started_at).toLocaleString()}
        </Typography>
        {instance.finished_at && (
          <Typography variant="body2" color="text.secondary">
            Finished at: {new Date(instance.finished_at).toLocaleString()}
          </Typography>
        )}
        {instance.stop_reason && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Stop reason: {instance.stop_reason}
          </Alert>
        )}
        <Box sx={{ mt: 1.5 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption" color="text.secondary">{progress}% completed</Typography>
        </Box>
      </Paper>

      {(instance.actions || []).map((action: any) => {
        const latestAttempt = action.attempts?.length ? action.attempts[action.attempts.length - 1] : null;
        const latestStatus = latestAttempt?.status || action.state || 'NOT_STARTED';
        const configName = action.action_meta?.rendered_config_name;
        const cfg = configName ? renderedConfigByName[configName] : '';
        const canManual = !readOnly && action.is_current && action.manual_task && instance.status === 'RUNNING' && onManualAction;
        const canRetryAuto = !readOnly && action.is_current && !action.manual_task && action.state === 'FAILED' && instance.status === 'RUNNING' && onRetryAutomatic;

        return (
          <Paper key={action.code} variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1}>
              <Typography variant="subtitle1">{action.sequence}. {action.description}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {action.is_current && <Chip size="small" label="CURRENT" color="primary" />}
                <Chip size="small" label={latestStatus} color={statusColor(latestStatus) as any} />
              </Stack>
            </Stack>
            <Typography variant="body2" color="text.secondary">{action.code}</Typography>

            {latestAttempt?.progress && <Alert severity="info" sx={{ mt: 1 }}>{latestAttempt.progress}</Alert>}
            {latestAttempt?.error && <Alert severity="error" sx={{ mt: 1 }}>{latestAttempt.error}</Alert>}

            {!!action.attempts?.length && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Attempts: {action.attempts.length}
              </Typography>
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1.25 }}>
              {cfg && (
                <>
                  <Button size="small" variant="outlined" onClick={() => setVisibleConfigByAction((prev) => ({ ...prev, [action.code]: !prev[action.code] }))}>
                    {visibleConfigByAction[action.code] ? 'Hide Config' : 'Show Config'}
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(cfg)}>
                    Copy Config
                  </Button>
                </>
              )}

              {canManual && (
                <>
                  <TextField
                    size="small"
                    label="Note"
                    value={noteByAction[action.code] || ''}
                    onChange={(event) => setNoteByAction((prev) => ({ ...prev, [action.code]: event.target.value }))}
                  />
                  <Button size="small" variant="contained" color="success" onClick={() => onManualAction(action.code, true, noteByAction[action.code])}>
                    Mark Done
                  </Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => onManualAction(action.code, false, noteByAction[action.code])}>
                    Mark Failed
                  </Button>
                </>
              )}

              {canRetryAuto && (
                <Button size="small" variant="contained" color="warning" onClick={() => onRetryAutomatic(action.code)}>
                  Retry
                </Button>
              )}
            </Stack>

            {cfg && visibleConfigByAction[action.code] && (
              <TextField
                sx={{ mt: 1.5 }}
                fullWidth
                multiline
                minRows={10}
                value={cfg}
                InputProps={{ readOnly: true }}
              />
            )}
          </Paper>
        );
      })}
    </Stack>
  );
};

export default WorkflowInstance;

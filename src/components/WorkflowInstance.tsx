import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MaterialSymbol from './MaterialSymbol.tsx';
import DetailDialog from './DetailDialog.tsx';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

interface WorkflowInstanceProps {
  instance: any;
  readOnly?: boolean;
  renderedConfigByName?: Record<string, string>;
  onManualAction?: (actionCode: string, success: boolean, note?: string) => Promise<void>;
  onRetryAutomatic?: (actionCode: string) => Promise<void>;
  onViewTranscript?: (attemptId: string) => Promise<any>;
}

const statusColor = (status: string) => {
  if (status === 'COMPLETED' || status === 'SUCCESS') return 'success';
  if (status === 'FAILED' || status === 'STOPPED') return 'error';
  if (status === 'RUNNING') return 'warning';
  return 'default';
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

const formatDuration = (startedAt?: string | null, finishedAt?: string | null) => {
  if (!startedAt) {
    return 'N/A';
  }

  const start = new Date(startedAt);
  const end = finishedAt ? new Date(finishedAt) : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'N/A';
  }

  const totalSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

const buildResultText = (action: any, latestAttempt: any) =>
  latestAttempt?.error ||
  latestAttempt?.progress ||
  latestAttempt?.note ||
  latestAttempt?.status ||
  action.state ||
  'No result available.';

const renderJsonLikeValue = (value: any) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value, null, 2);
};

const WorkflowInstance: React.FC<WorkflowInstanceProps> = ({
  instance,
  readOnly = false,
  renderedConfigByName = {},
  onManualAction,
  onRetryAutomatic,
  onViewTranscript,
}) => {
  const [noteByAction, setNoteByAction] = useState<Record<string, string>>({});
  const [expandedByAction, setExpandedByAction] = useState<Record<string, boolean>>({});
  const [configDialogData, setConfigDialogData] = useState<{ title: string; data: any } | null>(null);
  const [transcriptDialogOpen, setTranscriptDialogOpen] = useState(false);
  const [transcriptDialogTitle, setTranscriptDialogTitle] = useState('Attempt Transcript');
  const [transcriptAttemptId, setTranscriptAttemptId] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<any>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [transcriptLoadingAttemptId, setTranscriptLoadingAttemptId] = useState<string | null>(null);

  const loadTranscript = useCallback(
    async (attemptId: string, options?: { keepExistingData?: boolean }) => {
      if (!attemptId || !onViewTranscript) {
        return;
      }

      if (!options?.keepExistingData) {
        setTranscriptData(null);
      }
      setTranscriptError(null);
      setTranscriptLoadingAttemptId(attemptId);

      try {
        const response = await onViewTranscript(attemptId);
        setTranscriptData(response);
      } catch (error: any) {
        setTranscriptError(
          error?.response?.data?.detail?.[0]?.msg ||
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            'Unable to load transcript.'
        );
      } finally {
        setTranscriptLoadingAttemptId(null);
      }
    },
    [onViewTranscript]
  );

  const handleOpenTranscript = async (action: any, attempt: any) => {
    if (!attempt?.id) {
      return;
    }

    setTranscriptDialogTitle(`Transcript - ${action.description} - Attempt ${attempt.attempt}`);
    setTranscriptAttemptId(attempt.id);
    setTranscriptDialogOpen(true);
    await loadTranscript(attempt.id);
  };

  useEffect(() => {
    if (
      !transcriptDialogOpen ||
      !transcriptAttemptId ||
      !transcriptData?.attempt?.status ||
      transcriptData.attempt.status !== 'RUNNING'
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (transcriptLoadingAttemptId === transcriptAttemptId) {
        return;
      }

      loadTranscript(transcriptAttemptId, { keepExistingData: true });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [
    loadTranscript,
    transcriptAttemptId,
    transcriptData?.attempt?.status,
    transcriptDialogOpen,
    transcriptLoadingAttemptId,
  ]);

  const handleCloseTranscriptDialog = () => {
    setTranscriptDialogOpen(false);
    setTranscriptAttemptId(null);
    setTranscriptData(null);
    setTranscriptError(null);
    setTranscriptLoadingAttemptId(null);
  };

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
    <>
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ px: 1.5, py: 1.1 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1}>
            <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>{instance.workflow_type}</Typography>
            <Chip size="small" label={instance.status} color={statusColor(instance.status) as any} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Started at: {formatDateTime(instance.started_at)}
          </Typography>
          {instance.finished_at && (
            <Typography variant="body2" color="text.secondary">
              Finished at: {formatDateTime(instance.finished_at)}
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
          const isExpanded = Boolean(expandedByAction[action.code]);
          const resultText = buildResultText(action, latestAttempt);

          return (
            <Paper key={action.code} variant="outlined" sx={{ px: 1.5, py: 0.9 }}>
              <Stack spacing={isExpanded ? 1 : 0}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', md: 'center' }}
                  spacing={1}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                      <MaterialSymbol
                        name={action.manual_task ? 'person' : 'settings'}
                        fontSize="small"
                        sx={{ color: 'primary.main' }}
                      />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.98rem', lineHeight: 1.3 }}>
                        {action.sequence}. {action.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Duration: {formatDuration(latestAttempt?.started_at, latestAttempt?.finished_at)}
                      </Typography>
                      {latestStatus === 'RUNNING' && (
                        <CircularProgress size={14} thickness={5} />
                      )}
                    </Stack>
                  </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    {cfg && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          setConfigDialogData({
                            title: `Rendered Configuration - ${configName || action.description}`,
                            data: {
                              name: configName || action.description,
                              configuration: cfg,
                            },
                          })
                        }
                      >
                        Show Config
                      </Button>
                    )}

                    {canRetryAuto && (
                      <Button size="small" variant="contained" color="warning" onClick={() => onRetryAutomatic(action.code)}>
                        Retry
                      </Button>
                    )}

                    {action.is_current && <Chip size="small" label="CURRENT" color="primary" />}
                    <Chip size="small" label={latestStatus} color={statusColor(latestStatus) as any} />
                    <IconButton
                      size="small"
                      aria-label={isExpanded ? 'Collapse task details' : 'Expand task details'}
                      onClick={() =>
                        setExpandedByAction((prev) => ({
                          ...prev,
                          [action.code]: !prev[action.code],
                        }))
                      }
                      sx={{ ml: { md: 0.5 } }}
                    >
                      <MaterialSymbol name={isExpanded ? 'expand_less' : 'expand_more'} fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>

                {canManual && (
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                  >
                    <TextField
                      size="small"
                      label="Note"
                      value={noteByAction[action.code] || ''}
                      onChange={(event) => setNoteByAction((prev) => ({ ...prev, [action.code]: event.target.value }))}
                      sx={{ minWidth: { md: 220 } }}
                    />
                    <Button size="small" variant="contained" color="success" onClick={() => onManualAction(action.code, true, noteByAction[action.code])}>
                      Mark Done
                    </Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => onManualAction(action.code, false, noteByAction[action.code])}>
                      Mark Failed
                    </Button>
                  </Stack>
                )}

                <Collapse in={isExpanded}>
                  <Stack spacing={1} sx={{ pt: 0.75 }}>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.75,
                        borderRadius: 1,
                        bgcolor: latestAttempt?.error ? 'error.50' : 'grey.100',
                        border: 1,
                        borderColor: latestAttempt?.error ? 'error.200' : 'divider',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          color: 'text.primary',
                          fontSize: '0.83rem',
                          lineHeight: 1.35,
                        }}
                      >
                        {resultText}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                      <Box>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                          Task Code
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{action.code}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                          Attempts
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{action.attempts?.length || 0}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                          Start Date
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{formatDateTime(latestAttempt?.started_at)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                          End Date
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{formatDateTime(latestAttempt?.finished_at)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                          Duration
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{formatDuration(latestAttempt?.started_at, latestAttempt?.finished_at)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                          Manual Task
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.83rem' }}>{action.manual_task ? 'Yes' : 'No'}</Typography>
                      </Box>
                    </Box>

                    {action.attempts?.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                          Attempts History
                        </Typography>
                        <Stack spacing={0.6}>
                          {action.attempts.map((attempt: any) => (
                            <Box
                              key={attempt.id || `${action.code}-${attempt.attempt}`}
                              sx={{ p: 0.85, border: 1, borderColor: 'divider', borderRadius: 1 }}
                            >
                              {(() => {
                                const canShowTranscriptAction =
                                  Boolean(onViewTranscript) &&
                                  Boolean(attempt.id) &&
                                  (
                                    Boolean(attempt.has_transcript) ||
                                    Boolean(action.has_transcript) ||
                                    String(attempt.status || '').toUpperCase() === 'RUNNING'
                                  );

                                return (
                              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={0.5}>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.83rem' }}>
                                  Attempt {attempt.attempt}
                                </Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                  {canShowTranscriptAction && (
                                    <IconButton
                                      size="small"
                                      aria-label={`Load transcript for attempt ${attempt.attempt}`}
                                      onClick={() => handleOpenTranscript(action, attempt)}
                                      disabled={transcriptLoadingAttemptId === attempt.id}
                                      sx={{ p: 0.25 }}
                                    >
                                      <MaterialSymbol name="build" fontSize="small" />
                                    </IconButton>
                                  )}
                                  <Chip size="small" label={attempt.status || 'N/A'} color={statusColor(attempt.status || '') as any} />
                                </Stack>
                              </Stack>
                                );
                              })()}
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.8rem' }}>
                                {formatDateTime(attempt.started_at)} - {formatDateTime(attempt.finished_at)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                Duration: {formatDuration(attempt.started_at, attempt.finished_at)}
                              </Typography>
                              {attempt.executed_by && (
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                  Executed by: {attempt.executed_by}
                                </Typography>
                              )}
                              {(attempt.progress || attempt.error || attempt.note) && (
                                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.82rem' }}>
                                  {attempt.error || attempt.progress || attempt.note}
                                </Typography>
                              )}
                              {attempt.details && (
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                                    Details
                                  </Typography>
                                  <Box sx={{ p: 0.65, borderRadius: 1, bgcolor: 'grey.100' }}>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontFamily:
                                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                        fontSize: '0.8rem',
                                      }}
                                    >
                                      {renderJsonLikeValue(attempt.details)}
                                    </Typography>
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {action.action_meta && (
                      <Box>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                          Other Details
                        </Typography>
                        <Box sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontFamily:
                                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                              fontSize: '0.8rem',
                            }}
                          >
                            {renderJsonLikeValue(action.action_meta)}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Stack>
                </Collapse>
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      <DetailDialog
        open={Boolean(configDialogData)}
        onClose={() => setConfigDialogData(null)}
        title={configDialogData?.title || 'Rendered Configuration'}
        data={configDialogData?.data}
        fieldActions={
          configDialogData
            ? {
                configuration: {
                  icon: <MaterialSymbol name="content_copy" fontSize="small" />,
                  label: 'Copy configuration',
                  onClick: async () => {
                    await navigator.clipboard.writeText(String(configDialogData.data?.configuration || '').replace(/\\n/g, '\n'));
                  },
                },
              }
            : undefined
        }
        fullWidthFields={['configuration']}
        preformattedFields={['configuration']}
      />

      <Dialog open={transcriptDialogOpen} onClose={handleCloseTranscriptDialog} maxWidth="md" fullWidth>
        <DialogTitle>{transcriptDialogTitle}</DialogTitle>
        <DialogContent dividers>
          {transcriptLoadingAttemptId && transcriptData && (
            <Box sx={{ mb: 1.25 }}>
              <LinearProgress />
            </Box>
          )}
          {!transcriptData && transcriptLoadingAttemptId ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <LinearProgress sx={{ width: '100%', maxWidth: 320 }} />
            </Box>
          ) : transcriptError ? (
            <Alert severity="error">{transcriptError}</Alert>
          ) : transcriptData ? (
            <Stack spacing={1.25}>
              <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                <Box>
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                    Status
                  </Typography>
                  <Typography variant="body2">{transcriptData.attempt?.status || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                    Duration
                  </Typography>
                  <Typography variant="body2">
                    {formatDuration(transcriptData.attempt?.started_at, transcriptData.attempt?.finished_at)}
                  </Typography>
                </Box>
              </Box>

              {Array.isArray(transcriptData.entries) && transcriptData.entries.length > 0 ? (
                transcriptData.entries.map((entry: any) => (
                  <Box key={entry.id || `${entry.sequence}-${entry.command}`} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={0.75} sx={{ mb: 0.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Command Sequence {entry.sequence}
                        </Typography>
                        {entry.duration_ms != null && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                            Duration: {entry.duration_ms} ms
                          </Typography>
                        )}
                      </Stack>
                      <Chip size="small" label={entry.status || 'N/A'} color={statusColor(entry.status || '') as any} />
                    </Stack>
                    {(entry.command || entry.response || entry.error_message) && (
                      <Box sx={{ mt: 0.75, p: 0.6, borderRadius: 1, bgcolor: 'grey.100' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            fontSize: '0.75rem',
                            lineHeight: 1.35,
                          }}
                        >
                          {[
                            entry.command ? `Command:\n${entry.command}` : null,
                            `Response:\n${entry.response ?? ''}`,
                          ]
                            .filter(Boolean)
                            .join('\n\n')}
                        </Typography>
                      </Box>
                    )}
                    {entry.error_message && (
                      <Box
                        sx={{
                          mt: 0.6,
                          p: 0.6,
                          borderRadius: 1,
                          bgcolor: 'error.50',
                          border: 1,
                          borderColor: 'error.200',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: 'error.dark',
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            fontSize: '0.75rem',
                            lineHeight: 1.35,
                          }}
                        >
                          {`Error:\n${entry.error_message}`}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ))
              ) : (
                <Alert severity="info">No transcript entries available.</Alert>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTranscriptDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WorkflowInstance;

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import { useResultBar } from '../contexts/ResultBarContext.tsx';
import {
  FormDialogGrid,
  FormDialogItem,
  formDialogActionsSx,
  formDialogContentSx,
  formDialogPaperSx,
  formDialogTitleSx,
} from '../components/FormDialogLayout.tsx';
import { olts, ontFiles, ontFileTransfers } from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

const FILE_TYPES = ['CONFIG', 'SW_VER'];
const DEFAULT_FORM_VALUES = {
  name: '',
  type: FILE_TYPES[0],
  description: '',
  storagePath: '',
};

const formatCellValue = (value: any) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const formatError = (error: any) =>
  error?.response?.data?.context?.message ||
  error?.response?.data?.detail?.context?.message ||
  error?.response?.data?.detail?.[0]?.msg ||
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  'Unable to save ONT file.';

const normalizeOntFileDetails = (payload: any) => payload?.data ?? payload ?? null;
const TERMINAL_TRANSFER_STATUSES = ['SUCCEEDED', 'FAILED'];

const formatTransferError = (error: any) =>
  error?.response?.data?.detail?.[0]?.msg ||
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  'Unable to start ONT file transfer.';

const getDefaultDestinationPath = (item: any) => {
  if (item?.storage_path) {
    const parts = String(item.storage_path).split('/');
    return parts[parts.length - 1] || item.name || '';
  }
  return item?.name || '';
};

const getTransferStatusColor = (status?: string) => {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'FAILED') return 'error';
  if (status === 'RUNNING') return 'warning';
  if (status === 'QUEUED') return 'info';
  return 'default';
};

const parseApiTimestamp = (value: any) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalizedValue =
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  const timestamp = new Date(normalizedValue).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};

const getTransferDurationSeconds = (transfer: any, now: number) => {
  if (!transfer) {
    return null;
  }

  const startTimestamp = transfer.started_at || transfer.created_at;
  const endTimestamp = transfer.finished_at || now;

  if (!startTimestamp || !endTimestamp) {
    return null;
  }

  const start = parseApiTimestamp(startTimestamp);
  const end = typeof endTimestamp === 'number' ? endTimestamp : parseApiTimestamp(endTimestamp);

  if (start === null || end === null) {
    return null;
  }

  return Math.max(0, Math.floor((end - start) / 1000));
};

const OntFiles: React.FC = () => {
  const { pushResult } = useResultBar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [transferItem, setTransferItem] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(DEFAULT_FORM_VALUES);
  const [selectedOltId, setSelectedOltId] = useState('');
  const [activeTransferId, setActiveTransferId] = useState<string | null>(null);
  const [transferStarted, setTransferStarted] = useState(false);
  const [reportedTransferId, setReportedTransferId] = useState<string | null>(null);
  const [durationNow, setDurationNow] = useState(() => Date.now());

  const { data, isLoading, refetch } = useQuery(['ont-files', page, rowsPerPage], () =>
    ontFiles.getAll({ page: page + 1, size: rowsPerPage, sort: UPDATED_AT_DESC_SORT })
  );
  const { data: oltsData } = useQuery(
    ['ont-file-transfer-olts'],
    () => olts.getAll({ size: 1000, sort: 'name' }),
    { enabled: transferDialogOpen }
  );
  const { data: transferStatus } = useQuery(
    ['ont-file-transfer', activeTransferId],
    () => ontFileTransfers.getById(activeTransferId as string),
    {
      enabled: Boolean(activeTransferId) && transferDialogOpen,
      refetchInterval: (currentData: any) =>
        currentData?.status && TERMINAL_TRANSFER_STATUSES.includes(currentData.status) ? false : 3000,
    }
  );

  const rows = useMemo(() => data?.data || [], [data]);
  const availableOlts = useMemo(() => oltsData?.data || [], [oltsData]);
  const detailViewItem = useMemo(() => {
    if (!viewingItem) {
      return null;
    }

    const { content, ...rest } = viewingItem;
    return rest;
  }, [viewingItem]);
  const currentTransfer = transferStatus || null;
  const transferDurationSeconds = useMemo(
    () => getTransferDurationSeconds(currentTransfer, durationNow),
    [currentTransfer, durationNow]
  );

  useEffect(() => {
    if (!transferDialogOpen || !currentTransfer?.status || TERMINAL_TRANSFER_STATUSES.includes(currentTransfer.status)) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setDurationNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentTransfer, transferDialogOpen]);

  useEffect(() => {
    if (!currentTransfer?.id || !TERMINAL_TRANSFER_STATUSES.includes(currentTransfer.status)) {
      return;
    }

    if (reportedTransferId === currentTransfer.id) {
      return;
    }

    if (currentTransfer.status === 'SUCCEEDED') {
      pushResult('success', `ONT file transfer completed for ${transferItem?.name || 'the selected file'}.`);
    } else {
      pushResult(
        'error',
        currentTransfer.error_message || `ONT file transfer failed for ${transferItem?.name || 'the selected file'}.`
      );
    }

    setReportedTransferId(currentTransfer.id);
  }, [currentTransfer, pushResult, reportedTransferId, transferItem]);

  const columns = useMemo(
    () => [
      { id: 'name', label: 'Name', format: formatCellValue },
      { id: 'type', label: 'Type', format: formatCellValue },
      { id: 'description', label: 'Description', format: formatCellValue },
      { id: 'storage_path', label: 'Storage Path', format: formatCellValue },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
    []
  );

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormError(null);
    setFormValues(DEFAULT_FORM_VALUES);
    setDialogOpen(true);
  };

  const handleView = async (item: any) => {
    try {
      const details = normalizeOntFileDetails(await ontFiles.getById(item.id));
      setViewingItem(details);
      setDetailDialogOpen(true);
    } catch (error: any) {
      setFormError(formatError(error));
    }
  };

  const handleEdit = async (item: any) => {
    setFormError(null);
    try {
      const details = normalizeOntFileDetails(await ontFiles.getById(item.id));
      setEditingItem(details);
      setFormValues({
        name: details?.name || '',
        type: details?.type || FILE_TYPES[0],
        description: details?.description || '',
        storagePath: details?.storage_path || '',
      });
      setDialogOpen(true);
    } catch (error: any) {
      setFormError(formatError(error));
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormError(null);
    setFormValues(DEFAULT_FORM_VALUES);
  };

  const handleTransferOpen = (item: any) => {
    setTransferItem(item);
    setTransferDialogOpen(true);
    setSelectedOltId('');
    setTransferError(null);
    setActiveTransferId(null);
    setTransferStarted(false);
    setReportedTransferId(null);
    setDurationNow(Date.now());
  };

  const handleTransferClose = () => {
    setTransferDialogOpen(false);
    setTransferItem(null);
    setSelectedOltId('');
    setTransferError(null);
    setActiveTransferId(null);
    setTransferStarted(false);
    setReportedTransferId(null);
    setDurationNow(Date.now());
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const formData = new FormData(event.target as HTMLFormElement);

    try {
      if (editingItem) {
        await ontFiles.update(editingItem.id, {
          name: formValues.name,
          type: formValues.type,
          description: formValues.description || null,
        });
      } else {
        const uploadFile = formData.get('file');
        if (!(uploadFile instanceof File) || !uploadFile.name) {
          setFormError('File is required.');
          return;
        }

        const payload = new FormData();
        payload.append('name', formValues.name);
        payload.append('type', formValues.type);
        if (formValues.description) {
          payload.append('description', formValues.description);
        }
        payload.append('file', uploadFile);

        await ontFiles.create(payload);
      }
      await refetch();
      handleClose();
    } catch (error: any) {
      setFormError(formatError(error));
    }
  };

  const handleTransferSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transferItem?.id) {
      return;
    }

    if (!selectedOltId) {
      setTransferError('OLT is required.');
      return;
    }

    setTransferError(null);
    setTransferStarted(true);

    try {
      const transfer = await ontFileTransfers.create({
        ont_file_id: transferItem.id,
        olt_id: selectedOltId,
        destination_path: getDefaultDestinationPath(transferItem),
      });
      setActiveTransferId(transfer.id);
    } catch (error: any) {
      setTransferStarted(false);
      setTransferError(formatTransferError(error));
    }
  };

  if (isLoading) {
    return (
      <Layout title="ONT Files">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="ONT Files">
      <Box sx={{ mb: 4 }}>
        <Button variant="contained" color="primary" onClick={openCreateDialog}>
          Add ONT File
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={rows}
        total={data?.pagination?.total || 0}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRowClick={handleView}
        onEdit={handleEdit}
        onTransfer={handleTransferOpen}
      />

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: formDialogPaperSx }}>
        <form onSubmit={handleSave}>
          <DialogTitle sx={formDialogTitleSx}>
            {editingItem ? 'Edit ONT File' : 'Create New ONT File'}
          </DialogTitle>
          <DialogContent sx={formDialogContentSx}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {formError}
              </Alert>
            )}
            <FormDialogGrid>
              <FormDialogItem>
                <TextField
                  autoFocus
                  name="name"
                  label="Name"
                  fullWidth
                  value={formValues.name}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </FormDialogItem>
              <FormDialogItem>
                <TextField
                  select
                  name="type"
                  label="Type"
                  fullWidth
                  value={formValues.type}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, type: event.target.value }))
                  }
                  required
                >
                  {FILE_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </FormDialogItem>
              <FormDialogItem fullWidth>
                <TextField
                  name="description"
                  label="Description"
                  fullWidth
                  value={formValues.description}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </FormDialogItem>
              {editingItem ? (
                <>
                  <FormDialogItem fullWidth>
                    <TextField
                      name="storage_path"
                      label="Storage Path"
                      fullWidth
                      value={formValues.storagePath}
                      InputProps={{ readOnly: true }}
                    />
                  </FormDialogItem>
                </>
              ) : (
                <FormDialogItem fullWidth>
                  <TextField
                    name="file"
                    label="File"
                    type="file"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ accept: '.cfg,.conf,.ini,.json,.txt,.xml,.bin,.img,.zip' }}
                  />
                </FormDialogItem>
              )}
              {formError && !dialogOpen && (
                <FormDialogItem fullWidth>
                  <Alert severity="error">{formError}</Alert>
                </FormDialogItem>
              )}
            </FormDialogGrid>
          </DialogContent>
          <DialogActions sx={formDialogActionsSx}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <DetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        title="ONT File Details"
        data={detailViewItem}
      />

      <Dialog
        open={transferDialogOpen}
        onClose={handleTransferClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: formDialogPaperSx }}
      >
        <form onSubmit={handleTransferSubmit}>
          <DialogTitle sx={formDialogTitleSx}>TFTP File transfer</DialogTitle>
          <DialogContent sx={formDialogContentSx}>
            {transferError && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {transferError}
              </Alert>
            )}
            <FormDialogGrid>
              <FormDialogItem fullWidth>
                <TextField
                  label="Selected File"
                  fullWidth
                  value={transferItem?.name || ''}
                  InputProps={{ readOnly: true }}
                />
              </FormDialogItem>
              <FormDialogItem fullWidth>
                <Autocomplete
                  options={availableOlts}
                  getOptionLabel={(option: any) => option?.name || ''}
                  isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                  value={availableOlts.find((olt: any) => olt.id === selectedOltId) || null}
                  onChange={(_event, value: any) => setSelectedOltId(value?.id || '')}
                  disabled={transferStarted}
                  loading={transferDialogOpen && !oltsData}
                  noOptionsText="No matching OLT found"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="OLT"
                      required
                      helperText={availableOlts.length === 0 ? 'No OLTs available.' : 'Type to search by OLT name.'}
                    />
                  )}
                />
              </FormDialogItem>
            </FormDialogGrid>

            {currentTransfer && (
              <Box sx={{ mt: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5 }}>
                  {!TERMINAL_TRANSFER_STATUSES.includes(currentTransfer.status) && (
                    <CircularProgress size={18} thickness={5} />
                  )}
                  <Chip
                    size="small"
                    label={currentTransfer.status}
                    color={getTransferStatusColor(currentTransfer.status) as any}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Protocol: {currentTransfer.protocol}
                  </Typography>
                </Stack>
                <FormDialogGrid>
                  <FormDialogItem>
                    <TextField
                      label="Target Host"
                      fullWidth
                      value={currentTransfer.target_host || 'N/A'}
                      InputProps={{ readOnly: true }}
                    />
                  </FormDialogItem>
                  <FormDialogItem>
                    <TextField
                      label="Destination Path"
                      fullWidth
                      value={currentTransfer.destination_path || 'N/A'}
                      InputProps={{ readOnly: true }}
                    />
                  </FormDialogItem>
                  <FormDialogItem>
                    <TextField
                      label="Duration"
                      fullWidth
                      value={transferDurationSeconds !== null ? `${transferDurationSeconds} s` : 'Pending'}
                      InputProps={{ readOnly: true }}
                    />
                  </FormDialogItem>
                  <FormDialogItem>
                    <TextField
                      label="Started At"
                      fullWidth
                      value={currentTransfer.started_at ? formatTableDateTime(currentTransfer.started_at) : 'Pending'}
                      InputProps={{ readOnly: true }}
                    />
                  </FormDialogItem>
                  <FormDialogItem>
                    <TextField
                      label="Finished At"
                      fullWidth
                      value={currentTransfer.finished_at ? formatTableDateTime(currentTransfer.finished_at) : 'Pending'}
                      InputProps={{ readOnly: true }}
                    />
                  </FormDialogItem>
                  {currentTransfer.error_message && (
                    <FormDialogItem fullWidth>
                      <Alert severity="error">{currentTransfer.error_message}</Alert>
                    </FormDialogItem>
                  )}
                </FormDialogGrid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={formDialogActionsSx}>
            <Button onClick={handleTransferClose}>
              {currentTransfer && TERMINAL_TRANSFER_STATUSES.includes(currentTransfer.status) ? 'Close' : 'Cancel'}
            </Button>
            {!activeTransferId && (
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!selectedOltId || availableOlts.length === 0}
              >
                Transfer
              </Button>
            )}
          </DialogActions>
        </form>
      </Dialog>
    </Layout>
  );
};

export default OntFiles;

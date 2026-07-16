import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import { FormDialogGrid, FormDialogItem, formDialogActionsSx, formDialogContentSx, formDialogPaperSx, formDialogTitleSx } from '../components/FormDialogLayout.tsx';
import { apiConfigs } from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

const columns = [
  { id: 'name', label: 'Name' },
  { id: 'component', label: 'Component', format: (value: string) => value || 'N/A' },
  { id: 'type', label: 'Type', format: (value: string) => value || 'N/A' },
  { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
];

const Settings: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [viewingConfig, setViewingConfig] = useState<any>(null);
  const [configValue, setConfigValue] = useState('{}');
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(['api-configs', page, rowsPerPage], () =>
    apiConfigs.getAll({ page: page + 1, size: rowsPerPage, sort: UPDATED_AT_DESC_SORT })
  );

  const openCreateDialog = () => {
    setEditingConfig(null);
    setConfigValue('{}');
    setFormError(null);
    setDialogOpen(true);
  };

  const handleView = (config: any) => {
    setViewingConfig(config);
    setDetailDialogOpen(true);
  };

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setConfigValue(
      config?.config ? JSON.stringify(config.config, null, 2) : '{}'
    );
    setFormError(null);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingConfig(null);
    setConfigValue('{}');
    setFormError(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setPageError(null);

    const formData = new FormData(event.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    let parsedConfig: Record<string, unknown> | null = null;

    if (configValue.trim()) {
      try {
        parsedConfig = JSON.parse(configValue);
      } catch {
        setFormError('Config must be valid JSON.');
        return;
      }
    }

    const payload = {
      ...data,
      config: parsedConfig,
    };

    try {
      if (editingConfig) {
        await apiConfigs.update(editingConfig.id, payload);
      } else {
        await apiConfigs.create(payload);
      }

      await refetch();
      handleClose();
    } catch (error: any) {
      setFormError(
        error?.response?.data?.detail?.[0]?.msg ||
          error?.response?.data?.message ||
          'Unable to save API configuration.'
      );
    }
  };

  if (isLoading) {
    return (
      <Layout title="Settings">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="Settings">
      <Box sx={{ mb: 4 }}>
        <Button variant="contained" color="primary" onClick={openCreateDialog}>
          Add Settings
        </Button>
      </Box>

      {pageError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {pageError}
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={data?.data || []}
        total={data?.pagination.total || 0}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRowClick={handleView}
        onEdit={handleEdit}
      />

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: formDialogPaperSx }}>
        <form onSubmit={handleSave}>
          <DialogTitle sx={formDialogTitleSx}>
            {editingConfig ? 'Edit API Config' : 'Create New API Config'}
          </DialogTitle>
          <DialogContent sx={formDialogContentSx}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {formError}
              </Alert>
            )}
            <FormDialogGrid>
              <FormDialogItem><TextField autoFocus name="name" label="Name" type="text" fullWidth defaultValue={editingConfig?.name || ''} /></FormDialogItem>
              <FormDialogItem><TextField name="component" label="Component" type="text" fullWidth defaultValue={editingConfig?.component || ''} /></FormDialogItem>
              <FormDialogItem><TextField name="type" label="Type" type="text" fullWidth defaultValue={editingConfig?.type || ''} /></FormDialogItem>
              <FormDialogItem fullWidth><TextField name="config" label="Config (JSON)" multiline minRows={10} fullWidth value={configValue} onChange={(event) => setConfigValue(event.target.value)} /></FormDialogItem>
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
        title="Settings details"
        data={viewingConfig}
      />
    </Layout>
  );
};

export default Settings;

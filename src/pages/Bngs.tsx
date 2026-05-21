import React, { useMemo, useState } from 'react';
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
  MenuItem,
  TextField,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import { bngModels, bngs } from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

const formatOptional = (value: string | null | undefined) =>
  value === null || value === undefined || value === '' ? 'N/A' : value;

const getErrorMessage = (error: any) =>
  error?.response?.data?.detail?.[0]?.msg ||
  error?.response?.data?.message ||
  'Unable to save BNG.';

const nullableString = (value: FormDataEntryValue | null) => {
  if (value === null || value === '') {
    return null;
  }

  return String(value);
};

const Bngs: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingBng, setEditingBng] = useState<any>(null);
  const [viewingBng, setViewingBng] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(['bngs', page, rowsPerPage], () =>
    bngs.getAll({ page: page + 1, size: rowsPerPage, sort: UPDATED_AT_DESC_SORT })
  );

  const { data: bngModelsData } = useQuery(['bng-models-list'], () =>
    bngModels.getAll({ size: 1000, sort: 'name' })
  );

  const modelNameById = useMemo(
    () => new Map((bngModelsData?.data || []).map((model: any) => [model.id, model.name])),
    [bngModelsData]
  );

  const columns = useMemo(
    () => [
      { id: 'name', label: 'Name' },
      {
        id: 'model_id',
        label: 'Model',
        format: (value: string) => formatOptional(modelNameById.get(value) || value),
      },
      { id: 'ip_address_v4', label: 'IP Address', format: formatOptional },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
    [modelNameById]
  );

  const openCreateDialog = () => {
    setEditingBng(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleView = (item: any) => {
    const decorated = {
      ...item,
      model_name: modelNameById.get(item.model_id) || 'N/A',
    };
    delete decorated.model_id;
    setViewingBng(decorated);
    setDetailDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingBng(item);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingBng(null);
    setFormError(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.target as HTMLFormElement);
  const payload = {
      name: formData.get('name'),
      model_id: nullableString(formData.get('model_id')),
      description: nullableString(formData.get('description')),
      ip_address_v4: nullableString(formData.get('ip_address_v4')),
      username: nullableString(formData.get('username')),
      password: nullableString(formData.get('password')),
    };

    try {
      if (editingBng) {
        await bngs.update(editingBng.id, payload);
      } else {
        await bngs.create(payload);
      }

      await refetch();
      handleClose();
    } catch (error: any) {
      setFormError(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <Layout title="BNGs">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="BNGs">
      <Box sx={{ mb: 4 }}>
        <Button variant="contained" color="primary" onClick={openCreateDialog}>
          Add New BNG
        </Button>
      </Box>

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

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSave} autoComplete="off">
          <DialogTitle>
            {editingBng ? 'Edit BNG' : 'Create New BNG'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'none' }} aria-hidden="true">
              <input type="text" name="fake_username" autoComplete="username" tabIndex={-1} />
              <input type="password" name="fake_password" autoComplete="current-password" tabIndex={-1} />
            </Box>
            {formError && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {formError}
              </Alert>
            )}
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Name"
              type="text"
              fullWidth
              defaultValue={editingBng?.name || ''}
              required
            />
            <TextField
              select
              margin="dense"
              name="model_id"
              label="Model"
              fullWidth
              defaultValue={editingBng?.model_id || ''}
            >
              <MenuItem value="">N/A</MenuItem>
              {(bngModelsData?.data || []).map((model: any) => (
                <MenuItem key={model.id} value={model.id}>
                  {model.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              margin="dense"
              name="ip_address_v4"
              label="IP Address"
              type="text"
              fullWidth
              defaultValue={editingBng?.ip_address_v4 || ''}
            />
            <TextField
              margin="dense"
              name="username"
              label="Username"
              type="text"
              fullWidth
              defaultValue={editingBng?.username || ''}
              autoComplete="off"
              inputProps={{
                autoComplete: 'off',
                'data-lpignore': 'true',
                'data-form-type': 'other',
              }}
            />
            <TextField
              margin="dense"
              name="password"
              label="Password"
              type="password"
              fullWidth
              defaultValue={editingBng?.password || ''}
              autoComplete="new-password"
              inputProps={{
                autoComplete: 'new-password',
                'data-lpignore': 'true',
                'data-form-type': 'other',
              }}
            />
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              defaultValue={editingBng?.description || ''}
            />
          </DialogContent>
          <DialogActions>
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
        title="BNG Details"
        data={viewingBng}
      />
    </Layout>
  );
};

export default Bngs;

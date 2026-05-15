import React, { useMemo, useState } from 'react';
import MaterialSymbol from '../components/MaterialSymbol.tsx';
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
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import { pops, switches, switchModels } from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

const switchTypes = ['ACCESS', 'DISTRIBUTION'];

const formatOptional = (value: string | null | undefined) =>
  value === null || value === undefined || value === '' ? 'N/A' : value;

const getErrorMessage = (error: any) =>
  error?.response?.data?.detail?.[0]?.msg ||
  error?.response?.data?.message ||
  'Unable to save switch.';

const nullableString = (value: FormDataEntryValue | null) => {
  if (value === null || value === '') {
    return null;
  }

  return String(value);
};

const Switches: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingSwitch, setEditingSwitch] = useState<any>(null);
  const [viewingSwitch, setViewingSwitch] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showUsername, setShowUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { data, isLoading, refetch } = useQuery(['switches', page, rowsPerPage], () =>
    switches.getAll({ page: page + 1, size: rowsPerPage, sort: UPDATED_AT_DESC_SORT })
  );

  const { data: popsData } = useQuery(['pops'], () => pops.getAll({ size: 1000 }));
  const { data: switchModelsData } = useQuery(['switch-models-list'], () =>
    switchModels.getAll({ size: 1000, sort: 'name' })
  );

  const popNameById = useMemo(
    () =>
      new Map(
        (popsData?.data || []).map((pop: any) => [pop.id, pop.name])
      ),
    [popsData]
  );

  const modelNameById = useMemo(
    () =>
      new Map(
        (switchModelsData?.data || []).map((model: any) => [model.id, model.name])
      ),
    [switchModelsData]
  );

  const columns = useMemo(
    () => [
      { id: 'name', label: 'Name' },
      { id: 'type', label: 'Type' },
      {
        id: 'model_id',
        label: 'Model',
        format: (value: string) => formatOptional(modelNameById.get(value) || value),
      },
      {
        id: 'pop_id',
        label: 'POP',
        format: (value: string) => formatOptional(popNameById.get(value) || value),
      },
      { id: 'ip_address_v4', label: 'IP Address', format: formatOptional },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
    [modelNameById, popNameById]
  );

  const openCreateDialog = () => {
    setEditingSwitch(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const decorateSwitch = (item: any) => ({
    ...item,
    model_name: modelNameById.get(item.model_id) || 'N/A',
    pop_name: popNameById.get(item.pop_id) || 'N/A',
  });

  const handleView = (item: any) => {
    const decorated = decorateSwitch(item);
    delete decorated.model_id;
    delete decorated.pop_id;
    setViewingSwitch(decorated);
    setDetailDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingSwitch(item);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingSwitch(null);
    setFormError(null);
    setShowUsername(false);
    setShowPassword(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.target as HTMLFormElement);
    const payload = {
      name: formData.get('name'),
      type: formData.get('type'),
      model_id: nullableString(formData.get('model_id')),
      pop_id: nullableString(formData.get('pop_id')),
      description: nullableString(formData.get('description')),
      ip_address_v4: nullableString(formData.get('ip_address_v4')),
      username: nullableString(formData.get('username')),
      password: nullableString(formData.get('password')),
    };

    try {
      if (editingSwitch) {
        await switches.update(editingSwitch.id, payload);
      } else {
        await switches.create(payload);
      }

      await refetch();
      handleClose();
    } catch (error: any) {
      setFormError(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <Layout title="Switches">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="Switches">
      <Box sx={{ mb: 4 }}>
        <Button variant="contained" color="primary" onClick={openCreateDialog}>
          Add New Switch
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
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editingSwitch ? 'Edit Switch' : 'Create New Switch'}
          </DialogTitle>
          <DialogContent>
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
              defaultValue={editingSwitch?.name || ''}
              required
            />
            <TextField
              select
              margin="dense"
              name="type"
              label="Type"
              fullWidth
              defaultValue={editingSwitch?.type || 'ACCESS'}
              required
            >
              {switchTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              margin="dense"
              name="model_id"
              label="Model"
              fullWidth
              defaultValue={editingSwitch?.model_id || ''}
            >
              <MenuItem value="">N/A</MenuItem>
              {switchModelsData?.data.map((model: any) => (
                <MenuItem key={model.id} value={model.id}>
                  {model.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              margin="dense"
              name="pop_id"
              label="POP"
              fullWidth
              defaultValue={editingSwitch?.pop_id || ''}
            >
              <MenuItem value="">N/A</MenuItem>
              {popsData?.data.map((pop: any) => (
                <MenuItem key={pop.id} value={pop.id}>
                  {pop.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              margin="dense"
              name="ip_address_v4"
              label="IP Address"
              type="text"
              fullWidth
              defaultValue={editingSwitch?.ip_address_v4 || ''}
            />
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Credentials
              </Typography>
              <TextField
                margin="dense"
                name="username"
                label="Username"
                type={showUsername ? 'text' : 'password'}
                fullWidth
                defaultValue={editingSwitch?.username || ''}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showUsername ? 'Hide username' : 'Show username'}
                        onClick={() => setShowUsername((prev) => !prev)}
                        onMouseDown={(event) => event.preventDefault()}
                        edge="end"
                      >
                        {showUsername ? <MaterialSymbol name="visibility_off" /> : <MaterialSymbol name="visibility" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                margin="dense"
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                defaultValue={editingSwitch?.password || ''}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((prev) => !prev)}
                        onMouseDown={(event) => event.preventDefault()}
                        edge="end"
                      >
                        {showPassword ? <MaterialSymbol name="visibility_off" /> : <MaterialSymbol name="visibility" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              defaultValue={editingSwitch?.description || ''}
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
        title="Switch Details"
        data={viewingSwitch}
      />
    </Layout>
  );
};

export default Switches;

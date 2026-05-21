import React, { useCallback, useMemo, useState, useEffect } from 'react';
import MaterialSymbol from '../components/MaterialSymbol.tsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  MenuItem,
  InputAdornment,
  IconButton,
  Typography,
  Alert,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import { useResultBar } from '../contexts/ResultBarContext.tsx';
import { olts, oltModels, pops, workflows } from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

const formatOptional = (value: string | null | undefined) =>
  value === null || value === undefined || value === '' ? 'N/A' : value;

const nullableString = (value: FormDataEntryValue | null) => {
  if (value === null || value === '') {
    return null;
  }

  return String(value);
};

const getErrorMessage = (error: any) =>
  error?.response?.data?.detail?.[0]?.msg ||
  error?.response?.data?.message ||
  'Unable to save OLT.';

const Olts: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingOlt, setEditingOlt] = useState<any>(null);
  const [viewingOlt, setViewingOlt] = useState<any>(null);
  const [searchName, setSearchName] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showUsername, setShowUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testingOlt, setTestingOlt] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [isNavigatingToSettings, setIsNavigatingToSettings] = useState(false);
  const [startingWorkflowId, setStartingWorkflowId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushResult } = useResultBar();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchName);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchName]);

  const { data, isLoading, refetch } = useQuery(
    ['olts', page, rowsPerPage, debouncedSearch], 
    () => olts.getAll({ 
      page: page + 1, 
      size: rowsPerPage,
      sort: UPDATED_AT_DESC_SORT,
      ...(debouncedSearch && { q: `name[regex]:${debouncedSearch}` })
    }),
    {
      keepPreviousData: true,
      enabled: !isNavigatingToSettings,
      refetchOnWindowFocus: false,
    }
  );

  const { data: popsData } = useQuery(
    ['pops'],
    () => pops.getAll({ size: 1000 }),
    {
      enabled: !isNavigatingToSettings,
      refetchOnWindowFocus: false,
    }
  );
  const { data: oltModelsData } = useQuery(['olt-models-list'], () =>
    oltModels.getAll({ size: 1000, sort: 'name' })
  , {
    enabled: !isNavigatingToSettings,
    refetchOnWindowFocus: false,
  });

  const popNameById = useMemo(
    () => new Map((popsData?.data || []).map((pop: any) => [pop.id, pop.name])),
    [popsData]
  );

  const modelNameById = useMemo(
    () => new Map((oltModelsData?.data || []).map((model: any) => [model.id, model.name])),
    [oltModelsData]
  );

  const columns = useMemo(
    () => [
      { id: 'name', label: 'Name' },
      {
        id: 'model_id',
        label: 'Model',
        format: (value: string) => formatOptional(modelNameById.get(value) || value),
      },
      { id: 'area', label: 'Area', format: formatOptional },
      { id: 'ip_address_v4', label: 'IP Address', format: formatOptional },
      { id: 'sntp_ip_address', label: 'SNTP IP', format: formatOptional },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
    [modelNameById]
  );

  const decorateOlt = useCallback(
    (olt: any) => ({
      ...olt,
      model_name: modelNameById.get(olt.model_id) || 'N/A',
      pop_name: popNameById.get(olt.pop_id) || 'N/A',
    }),
    [modelNameById, popNameById]
  );

  useEffect(() => {
    const openOltId = location.state?.openOltId;

    if (!openOltId || !data?.data) {
      return;
    }

    const matchedOlt = data.data.find((olt: any) => olt.id === openOltId);
    if (!matchedOlt) {
      return;
    }

    const oltWithNames = decorateOlt(matchedOlt);

    delete oltWithNames.model_id;
    delete oltWithNames.pop_id;

    setViewingOlt(oltWithNames);
    setDetailDialogOpen(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [data, decorateOlt, location.pathname, location.state, navigate]);

  const handleView = (olt: any) => {
    const oltWithNames = decorateOlt(olt);

    delete oltWithNames.model_id;
    delete oltWithNames.pop_id;

    setViewingOlt(oltWithNames);
    setDetailDialogOpen(true);
  };

  const handleEdit = (olt: any) => {
    setEditingOlt(olt);
    setSelectedModelId(olt.model_id || '');
    setFormError(null);
    setDialogOpen(true);
  };

  const handleConfigure = async (olt: any) => {
    setIsNavigatingToSettings(true);
    await Promise.all([
      queryClient.cancelQueries({ queryKey: ['olts'] }),
      queryClient.cancelQueries({ queryKey: ['pops'] }),
      queryClient.cancelQueries({ queryKey: ['olt-models-list'] }),
    ]);
    navigate(`/olts/${olt.id}/settings`);
  };

  const handleViewRenderedConfigurations = (olt: any) => {
    navigate(`/olts/${olt.id}/rendered-configurations`);
  };

  const handleStartInitializationWorkflow = async (olt: any) => {
    try {
      setStartingWorkflowId(olt.id);
      const instance = await workflows.startOltInitialization(olt.id);
      navigate(`/olts/${olt.id}/workflow/${instance.id}`);
    } catch (error) {
      console.error('Error starting OLT initialization workflow:', error);
      pushResult('error', `Unable to start initialization workflow for ${olt.name || 'selected OLT'}`);
    } finally {
      setStartingWorkflowId(null);
    }
  };


  const handleClose = () => {
    setDialogOpen(false);
    setEditingOlt(null);
    setFormError(null);
    setSelectedModelId('');
    setShowUsername(false);
    setShowPassword(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const formData = new FormData(event.target as HTMLFormElement);
    const payload = {
      name: formData.get('name'),
      description: nullableString(formData.get('description')),
      model_id: nullableString(formData.get('model_id')),
      software_version: nullableString(formData.get('software_version')),
      logging_type: nullableString(formData.get('logging_type')) || 'syslog',
      ip_address_v4: nullableString(formData.get('ip_address_v4')),
      sntp_ip_address: nullableString(formData.get('sntp_ip_address')),
      syslog_ip_address: nullableString(formData.get('syslog_ip_address')),
      area: nullableString(formData.get('area')),
      pop_id: nullableString(formData.get('pop_id')),
      username: formData.get('username'),
      password: formData.get('password'),
      enabled: formData.get('enabled') === 'true',
    };

    try {
      if (editingOlt) {
        await olts.update(editingOlt.id, payload);
      } else {
        await olts.create(payload);
      }
      refetch();
      handleClose();
    } catch (error: any) {
      console.error('Error saving OLT:', error);
      setFormError(getErrorMessage(error));
    }
  };

  const handleTestReachability = async () => {
    if (!viewingOlt?.id) {
      return;
    }

    setTestingOlt(true);

    try {
      const result = await olts.isReachable(viewingOlt.id);
      const reachable = Boolean(result.reachable);
      const oltName = viewingOlt.name || 'selected OLT';

      pushResult(
        reachable ? 'success' : 'error',
        reachable
          ? `The OLT ${oltName} is reachable`
          : `The OLT ${oltName} is NOT reachable`
      );
    } catch (error) {
      console.error('Error testing OLT reachability:', error);
      pushResult('error', `Unable to test OLT ${viewingOlt.name || 'selected OLT'}`);
    } finally {
      setTestingOlt(false);
    }
  };

  if (isLoading && !data) {
    return (
      <Layout title="Optical Line Terminals">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="Optical Line Terminals">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search by Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MaterialSymbol name="search" />
                </InputAdornment>
              ),
              endAdornment: searchName && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchName('')}
                    edge="end"
                  >
                    <MaterialSymbol name="close" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setEditingOlt(null);
              setFormError(null);
              setSelectedModelId('');
              setDialogOpen(true);
            }}
          >
            Add New OLT
          </Button>
        </Box>
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
        onConfigure={handleConfigure}
        onDocument={handleViewRenderedConfigurations}
        isConfigureDisabled={(olt: any) => !olt.model_id}
        onEdit={handleEdit}
      />

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <form onSubmit={handleSave} autoComplete="off">
          <DialogTitle>
            {editingOlt ? 'Edit OLT' : 'Create New OLT'}
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
              defaultValue={editingOlt?.name || ''}
              required
            />
            <TextField
              select
              margin="dense"
              name="model_id"
              label="Model"
              fullWidth
              value={selectedModelId}
              onChange={(event) => setSelectedModelId(event.target.value)}
              required
            >
              {oltModelsData?.data.map((model: any) => (
                <MenuItem key={model.id} value={model.id}>
                  {model.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              defaultValue={editingOlt?.description || ''}
              required
            />
            <TextField
              margin="dense"
              name="software_version"
              label="Software Version"
              type="text"
              fullWidth
              defaultValue={editingOlt?.software_version || ''}
              required
            />
            <TextField
              margin="dense"
              name="ip_address_v4"
              label="IP Address"
              type="text"
              fullWidth
              defaultValue={editingOlt?.ip_address_v4 || ''}
              required
            />
            <TextField
              margin="dense"
              name="sntp_ip_address"
              label="SNTP IP Address"
              type="text"
              fullWidth
              defaultValue={editingOlt?.sntp_ip_address || ''}
              required
            />
            <TextField
              margin="dense"
              name="syslog_ip_address"
              label="Syslog IP Address"
              type="text"
              fullWidth
              defaultValue={editingOlt?.syslog_ip_address || ''}
            />
            <TextField
              margin="dense"
              name="area"
              label="Area"
              type="text"
              fullWidth
              defaultValue={editingOlt?.area || ''}
              required
            />
            <TextField
              select
              margin="dense"
              name="pop_id"
              label="POP"
              fullWidth
              defaultValue={editingOlt?.pop_id || ''}
              required
            >
              {popsData?.data.map((pop: any) => (
                <MenuItem key={pop.id} value={pop.id}>
                  {pop.name}
                </MenuItem>
              ))}
            </TextField>
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
                defaultValue={editingOlt?.username || ''}
                required
                autoComplete="off"
                inputProps={{
                  autoComplete: 'off',
                  'data-lpignore': 'true',
                  'data-form-type': 'other',
                }}
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
                defaultValue={editingOlt?.password || ''}
                required
                autoComplete="new-password"
                inputProps={{
                  autoComplete: 'new-password',
                  'data-lpignore': 'true',
                  'data-form-type': 'other',
                }}
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
              name="logging_type"
              label="Logging Type"
              type="text"
              fullWidth
              defaultValue={editingOlt?.logging_type || 'syslog'}
            />
            <TextField
              select
              margin="dense"
              name="enabled"
              label="Enabled"
              fullWidth
              defaultValue={editingOlt?.enabled !== undefined ? String(editingOlt.enabled) : 'true'}
            >
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </TextField>
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
        title="OLT Details"
        data={viewingOlt}
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={handleTestReachability}
              disabled={testingOlt || !viewingOlt?.id}
              variant="outlined"
            >
              {testingOlt ? 'Testing...' : 'Test'}
            </Button>
            <Button
              onClick={() => viewingOlt && handleStartInitializationWorkflow(viewingOlt)}
              disabled={!viewingOlt?.id || startingWorkflowId === viewingOlt?.id}
              variant="contained"
            >
              {startingWorkflowId === viewingOlt?.id ? 'Starting...' : 'Start Initialization'}
            </Button>
          </Box>
        }
        fieldActions={
          viewingOlt?.pop_name && viewingOlt?.pop_name !== 'N/A'
            ? {
                pop_name: {
                  icon: <MaterialSymbol name="open_in_new" fontSize="small" />,
                  label: 'Open POP details',
                  onClick: () => {
                    const targetOlt = data?.data.find((olt: any) => olt.id === viewingOlt.id);
                    const targetPop = popsData?.data.find((pop: any) => pop.id === targetOlt?.pop_id);

                    setDetailDialogOpen(false);
                    navigate('/pops', {
                      state: {
                        openPopId: targetOlt?.pop_id,
                        openPopData: targetPop,
                      },
                    });
                  },
                },
              }
            : undefined
        }
      />

    </Layout>
  );
};

export default Olts;

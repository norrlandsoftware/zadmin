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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import { FormDialogGrid, FormDialogItem, FormDialogSectionTitle, formDialogActionsSx, formDialogContentSx, formDialogPaperSx, formDialogTitleSx } from '../components/FormDialogLayout.tsx';
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

const getReachabilityErrorMessage = (payload: any) =>
  payload?.error ||
  payload?.detail?.error ||
  payload?.detail?.[0]?.msg ||
  payload?.message ||
  null;

const getWorkflowInstances = (workflowInstancesResponse: any) => {
  if (!workflowInstancesResponse) {
    return [];
  }

  if (Array.isArray(workflowInstancesResponse)) {
    return workflowInstancesResponse;
  }

  if (Array.isArray(workflowInstancesResponse.data)) {
    return workflowInstancesResponse.data;
  }

  return [];
};

const OLT_USERNAME_FIELD_NAME = 'olt_device_username';
const OLT_PASSWORD_FIELD_NAME = 'olt_device_password';

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
  const [selectedModelCode, setSelectedModelCode] = useState('');
  const [isNavigatingToSettings, setIsNavigatingToSettings] = useState(false);
  const [startingWorkflowId, setStartingWorkflowId] = useState<string | null>(null);
  const [viewingOltId, setViewingOltId] = useState<string | null>(null);
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
  const { data: viewingOltDetails, isLoading: isLoadingOltDetails } = useQuery(
    ['olt-details', viewingOltId],
    () => olts.getById(viewingOltId as string),
    {
      enabled: detailDialogOpen && Boolean(viewingOltId),
      refetchOnWindowFocus: false,
    }
  );
  const { data: viewingWorkflowInstances, isLoading: isLoadingWorkflowInstances } = useQuery(
    ['olt-workflow-instances', viewingOltId],
    () => workflows.getOltInstances(viewingOltId as string),
    {
      enabled: detailDialogOpen && Boolean(viewingOltId),
      refetchOnWindowFocus: false,
    }
  );

  const popNameById = useMemo(
    () => new Map((popsData?.data || []).map((pop: any) => [pop.id, pop.name])),
    [popsData]
  );

  const modelNameById = useMemo(
    () => new Map((oltModelsData?.data || []).map((model: any) => [model.id, model.name])),
    [oltModelsData]
  );

  const modelNameByCode = useMemo(
    () => new Map((oltModelsData?.data || []).map((model: any) => [model.code, model.name])),
    [oltModelsData]
  );

  const modelById = useMemo(
    () => new Map((oltModelsData?.data || []).map((model: any) => [model.id, model])),
    [oltModelsData]
  );

  const modelByCode = useMemo(
    () => new Map((oltModelsData?.data || []).map((model: any) => [model.code, model])),
    [oltModelsData]
  );

  const columns = useMemo(
    () => [
      { id: 'name', label: 'Name' },
      { id: 'model_name', label: 'Model', format: formatOptional },
      { id: 'area', label: 'Area', format: formatOptional },
      { id: 'ip_address_v4', label: 'IP Address', format: formatOptional },
      { id: 'sntp_ip_address', label: 'SNTP IP', format: formatOptional },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
    []
  );

  const decorateOlt = useCallback(
    (olt: any) => ({
      ...olt,
      model_name:
        modelNameByCode.get(olt.model_code) ||
        modelNameById.get(olt.model_id) ||
        'N/A',
      pop_name: popNameById.get(olt.pop_id) || 'N/A',
    }),
    [modelNameByCode, modelNameById, popNameById]
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

    delete oltWithNames.pop_id;

    setViewingOltId(matchedOlt.id);
    setViewingOlt(oltWithNames);
    setDetailDialogOpen(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [data, decorateOlt, location.pathname, location.state, navigate]);

  const handleView = (olt: any) => {
    const oltWithNames = decorateOlt(olt);

    delete oltWithNames.pop_id;

    setViewingOltId(olt.id);
    setViewingOlt(oltWithNames);
    setDetailDialogOpen(true);
  };

  const handleEdit = (olt: any) => {
    setEditingOlt(olt);
    setSelectedModelCode(olt.model_code || '');
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
    } catch (error: any) {
      console.error('Error starting OLT initialization workflow:', error);
      const apiMessage =
        error?.response?.data?.context?.message ||
        error?.response?.data?.detail?.context?.message ||
        error?.response?.data?.detail?.[0]?.msg ||
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : null);
      pushResult(
        'error',
        apiMessage
          ? `Unable to start initialization workflow for ${olt.name || 'selected OLT'}: ${apiMessage}`
          : `Unable to start initialization workflow for ${olt.name || 'selected OLT'}`
      );
    } finally {
      setStartingWorkflowId(null);
    }
  };


  const handleClose = () => {
    setDialogOpen(false);
    setEditingOlt(null);
    setFormError(null);
    setSelectedModelCode('');
    setShowUsername(false);
    setShowPassword(false);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setViewingOltId(null);
  };

  const detailedViewingOlt = useMemo(() => {
    if (!viewingOlt) {
      return null;
    }

    const merged = viewingOltDetails
      ? { ...viewingOltDetails, pop_name: popNameById.get(viewingOltDetails.pop_id) || 'N/A' }
      : { ...viewingOlt };
    const rawModel = merged.model;
    const rawModelObject = rawModel && typeof rawModel === 'object' ? rawModel : null;
    const modelReferences = [
      merged.model_code,
      merged.model_id,
      merged.olt_model_code,
      merged.olt_model_id,
      typeof rawModel === 'string' ? rawModel : null,
      rawModelObject?.code,
      rawModelObject?.id,
      rawModelObject?.name,
      merged.model_name,
    ].filter(Boolean).map(String);
    const oltModel = modelReferences
      .map((reference) => modelByCode.get(reference) || modelById.get(reference))
      .find(Boolean)
      || (oltModelsData?.data || []).find((model: any) =>
        modelReferences.includes(String(model.id)) ||
        modelReferences.includes(String(model.code)) ||
        modelReferences.includes(String(model.name))
      );
    const modelDisplayName =
      [oltModel?.vendor, oltModel?.name].filter(Boolean).join(' ') ||
      [rawModelObject?.vendor, rawModelObject?.name].filter(Boolean).join(' ') ||
      merged.model_name ||
      (typeof rawModel === 'string' ? rawModel : '') ||
      'N/A';

    delete merged.pop_id;
    delete merged.model_id;
    delete merged.model_code;
    delete merged.model_name;
    delete merged.olt_model_id;
    delete merged.olt_model_code;

    return { ...merged, model: modelDisplayName };
  }, [modelByCode, modelById, oltModelsData, popNameById, viewingOlt, viewingOltDetails]);

  const initializationProcesses = useMemo(
    () =>
      getWorkflowInstances(viewingWorkflowInstances).filter((process: any) => {
        const workflowType = String(process?.workflow_type || process?.type || '').toLowerCase();
        return !workflowType || workflowType.includes('initialization');
      }),
    [viewingWorkflowInstances]
  );

  const tableData = useMemo(
    () => (data?.data || []).map((olt: any) => decorateOlt(olt)),
    [data, decorateOlt]
  );

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const formData = new FormData(event.target as HTMLFormElement);
    const payload = {
      name: formData.get('name'),
      description: nullableString(formData.get('description')),
      model_code: nullableString(formData.get('model_code')),
      software_version: nullableString(formData.get('software_version')),
      logging_type: nullableString(formData.get('logging_type')) || 'syslog',
      ip_address_v4: nullableString(formData.get('ip_address_v4')),
      sntp_ip_address: nullableString(formData.get('sntp_ip_address')),
      syslog_ip_address: nullableString(formData.get('syslog_ip_address')),
      area: nullableString(formData.get('area')),
      pop_id: nullableString(formData.get('pop_id')),
      username: formData.get(OLT_USERNAME_FIELD_NAME),
      password: formData.get(OLT_PASSWORD_FIELD_NAME),
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
      const errorMessage = getReachabilityErrorMessage(result);

      pushResult(
        reachable ? 'success' : 'error',
        reachable
          ? `The OLT ${oltName} is reachable`
          : errorMessage
            ? `The OLT ${oltName} is NOT reachable: ${errorMessage}`
            : `The OLT ${oltName} is NOT reachable`
      );
    } catch (error: any) {
      console.error('Error testing OLT reachability:', error);
      const errorMessage = getReachabilityErrorMessage(error?.response?.data);
      pushResult(
        'error',
        errorMessage
          ? `Unable to test OLT ${viewingOlt.name || 'selected OLT'}: ${errorMessage}`
          : `Unable to test OLT ${viewingOlt.name || 'selected OLT'}`
      );
    } finally {
      setTestingOlt(false);
    }
  };

  const handleOpenWorkflowInstance = (workflowInstance: any) => {
    if (!viewingOltId || !workflowInstance?.id) {
      return;
    }

    handleCloseDetailDialog();
    navigate(`/olts/${viewingOltId}/workflow/${workflowInstance.id}`);
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
              setSelectedModelCode('');
              setDialogOpen(true);
            }}
          >
            Add New OLT
          </Button>
        </Box>
      </Box>

      <DataTable
        columns={columns}
        data={tableData}
        total={data?.pagination.total || 0}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRowClick={handleView}
        onConfigure={handleConfigure}
        onDocument={handleViewRenderedConfigurations}
        isConfigureDisabled={(olt: any) => !olt.model_code}
        onEdit={handleEdit}
      />

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: formDialogPaperSx }}>
        <form onSubmit={handleSave} autoComplete="off" data-form-type="other">
          <DialogTitle sx={formDialogTitleSx}>
            {editingOlt ? 'Edit OLT' : 'Create New OLT'}
          </DialogTitle>
          <DialogContent sx={formDialogContentSx}>
            <Box sx={{ display: 'none' }} aria-hidden="true">
              <input type="text" name="fake_username" autoComplete="username" tabIndex={-1} />
              <input type="password" name="fake_password" autoComplete="current-password" tabIndex={-1} />
            </Box>
            {formError && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {formError}
              </Alert>
            )}
            <FormDialogGrid>
              <FormDialogItem>
                <TextField autoFocus name="name" label="Name" type="text" fullWidth defaultValue={editingOlt?.name || ''} required />
              </FormDialogItem>
              <FormDialogItem>
                <TextField
                  select
                  name="model_code"
                  label="Model"
                  fullWidth
                  value={selectedModelCode}
                  onChange={(event) => setSelectedModelCode(event.target.value)}
                  required
                >
                  {oltModelsData?.data.map((model: any) => (
                    <MenuItem key={model.code} value={model.code}>
                      {model.name}
                    </MenuItem>
                  ))}
                </TextField>
              </FormDialogItem>
              <FormDialogItem fullWidth>
                <TextField name="description" label="Description" type="text" fullWidth multiline rows={3} defaultValue={editingOlt?.description || ''} required />
              </FormDialogItem>
              <FormDialogItem>
                <TextField name="software_version" label="Software Version" type="text" fullWidth defaultValue={editingOlt?.software_version || ''} required />
              </FormDialogItem>
              <FormDialogItem>
                <TextField name="ip_address_v4" label="IP Address" type="text" fullWidth defaultValue={editingOlt?.ip_address_v4 || ''} required />
              </FormDialogItem>
              <FormDialogItem>
                <TextField name="sntp_ip_address" label="SNTP IP Address" type="text" fullWidth defaultValue={editingOlt?.sntp_ip_address || ''} required />
              </FormDialogItem>
              <FormDialogItem>
                <TextField name="syslog_ip_address" label="Syslog IP Address" type="text" fullWidth defaultValue={editingOlt?.syslog_ip_address || ''} />
              </FormDialogItem>
              <FormDialogItem>
                <TextField name="area" label="Area" type="text" fullWidth defaultValue={editingOlt?.area || ''} required />
              </FormDialogItem>
              <FormDialogItem>
                <TextField select name="pop_id" label="POP" fullWidth defaultValue={editingOlt?.pop_id || ''} required>
                  {popsData?.data.map((pop: any) => (
                    <MenuItem key={pop.id} value={pop.id}>
                      {pop.name}
                    </MenuItem>
                  ))}
                </TextField>
              </FormDialogItem>
              <FormDialogItem>
                <TextField name="logging_type" label="Logging Type" type="text" fullWidth defaultValue={editingOlt?.logging_type || 'syslog'} />
              </FormDialogItem>
              <FormDialogItem>
                <TextField select name="enabled" label="Enabled" fullWidth defaultValue={editingOlt?.enabled !== undefined ? String(editingOlt.enabled) : 'true'}>
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </TextField>
              </FormDialogItem>
              <FormDialogItem fullWidth>
                <FormDialogSectionTitle>Credentials</FormDialogSectionTitle>
                <FormDialogGrid>
              <FormDialogItem>
                <TextField
                      name={OLT_USERNAME_FIELD_NAME}
                      label="Username"
                      type="text"
                      fullWidth
                      defaultValue={editingOlt?.username || ''}
                      required
                      autoComplete="one-time-code"
                      inputProps={{
                        autoComplete: 'one-time-code',
                        'data-lpignore': 'true',
                        'data-form-type': 'other',
                        spellCheck: 'false',
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
                  </FormDialogItem>
                <FormDialogItem>
                  <TextField
                      name={OLT_PASSWORD_FIELD_NAME}
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
                  </FormDialogItem>
                </FormDialogGrid>
              </FormDialogItem>
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
        onClose={handleCloseDetailDialog}
        title="OLT Details"
        data={detailedViewingOlt}
        fieldValueRenderers={{
          model: (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.45,
                border: 1,
                borderColor: 'primary.light',
                borderRadius: 1.5,
                bgcolor: '#f4f7ff',
                color: 'primary.main',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <MaterialSymbol name="check_circle" sx={{ fontSize: 15 }} />
              {detailedViewingOlt?.model || 'N/A'}
            </Box>
          ),
        }}
        extraContent={
          <Box>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
              Initialization Process
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Process</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Started Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingOltDetails || isLoadingWorkflowInstances ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                          <CircularProgress size={20} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : initializationProcesses.length > 0 ? (
                    initializationProcesses.map((process: any, index: number) => (
                      <TableRow
                        key={process.id || `${process.workflow_type || process.type || 'process'}-${index}`}
                        hover={Boolean(process.id)}
                        onClick={() => handleOpenWorkflowInstance(process)}
                        sx={process.id ? { cursor: 'pointer' } : undefined}
                      >
                        <TableCell>
                          {process.workflow_type || process.type || process.process || process.name || process.id || 'Initialization'}
                        </TableCell>
                        <TableCell>{formatOptional(process.status)}</TableCell>
                        <TableCell>{formatTableDateTime(process.started_at)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary">
                          No initialization processes available.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        }
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={handleTestReachability}
              disabled={testingOlt || !detailedViewingOlt?.id}
              variant="outlined"
            >
              {testingOlt ? 'Testing...' : 'Test'}
            </Button>
            <Button
              onClick={() => detailedViewingOlt && handleStartInitializationWorkflow(detailedViewingOlt)}
              disabled={!detailedViewingOlt?.id || startingWorkflowId === detailedViewingOlt?.id}
              variant="contained"
            >
              {startingWorkflowId === detailedViewingOlt?.id ? 'Starting...' : 'Start Initialization'}
            </Button>
          </Box>
        }
        fieldActions={
          detailedViewingOlt?.pop_name && detailedViewingOlt?.pop_name !== 'N/A'
            ? {
                pop_name: {
                  icon: <MaterialSymbol name="open_in_new" fontSize="small" />,
                  label: 'Open POP details',
                  onClick: () => {
                    const targetOlt = data?.data.find((olt: any) => olt.id === detailedViewingOlt.id);
                    const targetPop = popsData?.data.find((pop: any) => pop.id === targetOlt?.pop_id);

                    handleCloseDetailDialog();
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

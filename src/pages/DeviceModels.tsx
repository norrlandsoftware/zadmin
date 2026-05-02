import React, { useCallback, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
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
  ListItemText,
  MenuItem,
  TextField,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import {
  oltLineCardModels,
  oltModels,
  oltUplinkCardModels,
  switchModels,
} from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

type FieldType = 'text' | 'number' | 'boolean' | 'textarea' | 'olt-model-multi-select';

interface DeviceModelField {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
}

interface DeviceModelConfig {
  title: string;
  singular: string;
  queryKey: string;
  api: {
    getAll: (params?: any) => Promise<any>;
    create: (data: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
  };
  fields: DeviceModelField[];
  columns: Array<{
    id: string;
    label: string;
    format?: (value: any) => string;
  }>;
}

const formatBoolean = (value: boolean | null | undefined) => {
  if (value === null || value === undefined) return 'N/A';
  return value ? 'Yes' : 'No';
};

const formatOptional = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? 'N/A' : String(value);

const formatCompatibleModels = (value: string | null | undefined) =>
  value === null || value === undefined || value === '' ? 'All OLT models' : value;

const commonFields: DeviceModelField[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'vendor', label: 'Vendor', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
];

const deviceModelConfigs: Record<string, DeviceModelConfig> = {
  olt: {
    title: 'OLT Models',
    singular: 'OLT Model',
    queryKey: 'olt-models',
    api: oltModels,
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'vendor', label: 'Vendor', required: true },
      { name: 'modular', label: 'Modular', type: 'boolean' },
      { name: 'number_of_pon_ports', label: 'PON Ports', type: 'number' },
      { name: 'number_of_xgspon_ports', label: 'XGSPON Ports', type: 'number' },
      { name: 'number_of_uplink_ports', label: 'Uplink Ports', type: 'number' },
      { name: 'number_of_pon_slots', label: 'PON Slots', type: 'number' },
      { name: 'number_of_uplink_slots', label: 'Uplink Slots', type: 'number' },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'vendor', label: 'Vendor' },
      { id: 'modular', label: 'Modular', format: formatBoolean },
      { id: 'number_of_pon_ports', label: 'PON Ports', format: formatOptional },
      { id: 'number_of_pon_slots', label: 'PON Slots', format: formatOptional },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
  },
  'olt-line-card': {
    title: 'OLT Line Card Models',
    singular: 'OLT Line Card Model',
    queryKey: 'olt-line-card-models',
    api: oltLineCardModels,
    fields: [
      ...commonFields.slice(0, 2),
      { name: 'number_of_pon_ports', label: 'PON Ports', type: 'number', required: true },
      { name: 'number_of_xgspon_ports', label: 'XGSPON Ports', type: 'number', required: true },
      { name: 'olt_model_ids', label: 'Compatible OLT Models', type: 'olt-model-multi-select' },
      commonFields[2],
    ],
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'vendor', label: 'Vendor' },
      { id: 'number_of_pon_ports', label: 'PON Ports', format: formatOptional },
      { id: 'number_of_xgspon_ports', label: 'XGSPON Ports', format: formatOptional },
      { id: 'compatible_olt_models', label: 'Compatible OLT Models', format: formatCompatibleModels },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
  },
  'olt-uplink-card': {
    title: 'OLT Uplink Card Models',
    singular: 'OLT Uplink Card Model',
    queryKey: 'olt-uplink-card-models',
    api: oltUplinkCardModels,
    fields: [
      ...commonFields.slice(0, 2),
      { name: 'olt_model_ids', label: 'Compatible OLT Models', type: 'olt-model-multi-select' },
      commonFields[2],
    ],
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'vendor', label: 'Vendor' },
      { id: 'compatible_olt_models', label: 'Compatible OLT Models', format: formatCompatibleModels },
      { id: 'description', label: 'Description', format: formatOptional },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
  },
  switch: {
    title: 'Switch Models',
    singular: 'Switch Model',
    queryKey: 'switch-models',
    api: switchModels,
    fields: [
      ...commonFields,
      { name: 'number_of_port', label: 'Ports', type: 'number' },
    ],
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'vendor', label: 'Vendor' },
      { id: 'number_of_port', label: 'Ports', format: formatOptional },
      { id: 'description', label: 'Description', format: formatOptional },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
  },
};

const getErrorMessage = (error: any, singular: string) =>
  error?.response?.data?.detail?.[0]?.msg ||
  error?.response?.data?.message ||
  `Unable to save ${singular.toLowerCase()}.`;

const coerceFormValue = (
  value: FormDataEntryValue | FormDataEntryValue[] | null,
  field: DeviceModelField
) => {
  if (field.type === 'olt-model-multi-select') {
    const values = Array.isArray(value) ? value : value === null ? [] : [value];
    return values
      .flatMap((entry) => String(entry).split(','))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (value === null || value === '') {
    return field.required && field.type === 'number' ? 0 : null;
  }

  if (field.type === 'number') {
    return Number(value);
  }

  if (field.type === 'boolean') {
    return value === 'true' ? true : value === 'false' ? false : null;
  }

  return value;
};

const DeviceModels: React.FC = () => {
  const { modelType = '' } = useParams();
  const config = deviceModelConfigs[modelType];
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [viewingModel, setViewingModel] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const queryKey = useMemo(
    () => [config?.queryKey, page, rowsPerPage],
    [config?.queryKey, page, rowsPerPage]
  );

  const { data, isLoading, refetch } = useQuery(
    queryKey,
    () => config.api.getAll({ page: page + 1, size: rowsPerPage, sort: UPDATED_AT_DESC_SORT }),
    { enabled: Boolean(config) }
  );

  const shouldLoadOltModels =
    modelType === 'olt-line-card' || modelType === 'olt-uplink-card';

  const { data: oltModelsData, isLoading: isOltModelsLoading } = useQuery(
    ['device-models-compatible-olt-models'],
    () => oltModels.getAll({ size: 1000, sort: 'name' }),
    { enabled: shouldLoadOltModels }
  );

  const oltModelNameById = useMemo(
    () => new Map((oltModelsData?.data || []).map((model: any) => [model.id, model.name])),
    [oltModelsData]
  );

  const formatOltModelIds = useCallback((modelIds: unknown) => {
    if (!Array.isArray(modelIds) || modelIds.length === 0) {
      return 'All OLT models';
    }

    return modelIds
      .map((modelId) => oltModelNameById.get(modelId) || modelId)
      .join(', ');
  }, [oltModelNameById]);

  const tableData = useMemo(
    () =>
      (data?.data || []).map((model: any) => ({
        ...model,
        compatible_olt_models: shouldLoadOltModels
          ? formatOltModelIds(model.olt_model_ids)
          : model.compatible_olt_models,
      })),
    [data, formatOltModelIds, shouldLoadOltModels]
  );

  if (!config) {
    return <Navigate to="/device-models/olt" replace />;
  }

  const openCreateDialog = () => {
    setEditingModel(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleView = (model: any) => {
    if (shouldLoadOltModels) {
      const modelWithNames = {
        ...model,
        compatible_olt_models: formatOltModelIds(model.olt_model_ids),
      };
      delete modelWithNames.olt_model_ids;
      setViewingModel(modelWithNames);
    } else {
      setViewingModel(model);
    }
    setDetailDialogOpen(true);
  };

  const handleEdit = (model: any) => {
    setEditingModel(model);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingModel(null);
    setFormError(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.target as HTMLFormElement);
    const payload = config.fields.reduce<Record<string, any>>((current, field) => {
      const formValue =
        field.type === 'olt-model-multi-select'
          ? formData.getAll(field.name)
          : formData.get(field.name);
      current[field.name] = coerceFormValue(formValue, field);
      return current;
    }, {});

    try {
      if (editingModel) {
        await config.api.update(editingModel.id, payload);
      } else {
        await config.api.create(payload);
      }

      await refetch();
      handleClose();
    } catch (error: any) {
      setFormError(getErrorMessage(error, config.singular));
    }
  };

  const renderField = (field: DeviceModelField, index: number) => {
    const defaultValue = editingModel?.[field.name];

    if (field.type === 'boolean') {
      return (
        <TextField
          key={field.name}
          select
          margin="dense"
          name={field.name}
          label={field.label}
          fullWidth
          defaultValue={
            defaultValue === true ? 'true' : defaultValue === false ? 'false' : ''
          }
          required={field.required}
        >
          <MenuItem value="">N/A</MenuItem>
          <MenuItem value="true">Yes</MenuItem>
          <MenuItem value="false">No</MenuItem>
        </TextField>
      );
    }

    if (field.type === 'olt-model-multi-select') {
      const selectedValues = Array.isArray(defaultValue) ? defaultValue : [];

      return (
        <TextField
          key={field.name}
          select
          margin="dense"
          name={field.name}
          label={field.label}
          fullWidth
          defaultValue={selectedValues}
          SelectProps={{
            multiple: true,
            renderValue: (selected) =>
              formatOltModelIds(Array.isArray(selected) ? selected : []),
          }}
          helperText="Leave empty to allow all OLT models."
        >
          {(oltModelsData?.data || []).map((model: any) => (
            <MenuItem key={model.id} value={model.id}>
              <ListItemText primary={model.name} secondary={model.vendor} />
            </MenuItem>
          ))}
        </TextField>
      );
    }

    return (
      <TextField
        key={field.name}
        autoFocus={index === 0}
        margin="dense"
        name={field.name}
        label={field.label}
        type={field.type === 'number' ? 'number' : 'text'}
        fullWidth
        multiline={field.type === 'textarea'}
        rows={field.type === 'textarea' ? 3 : undefined}
        defaultValue={defaultValue ?? ''}
        required={field.required}
        inputProps={field.type === 'number' ? { min: 0, step: 1 } : undefined}
      />
    );
  };

  if (isLoading || (shouldLoadOltModels && isOltModelsLoading)) {
    return (
      <Layout title={config.title}>
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title={config.title}>
      <Box sx={{ mb: 4 }}>
        <Button variant="contained" color="primary" onClick={openCreateDialog}>
          Add {config.singular}
        </Button>
      </Box>

      <DataTable
        columns={config.columns}
        data={tableData}
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
            {editingModel ? `Edit ${config.singular}` : `Create New ${config.singular}`}
          </DialogTitle>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {formError}
              </Alert>
            )}
            {config.fields.map(renderField)}
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
        title={`${config.singular} Details`}
        data={viewingModel}
      />
    </Layout>
  );
};

export default DeviceModels;

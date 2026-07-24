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
  Typography,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import MaterialSymbol from '../components/MaterialSymbol.tsx';
import { FormDialogGrid, FormDialogItem, formDialogActionsSx, formDialogContentSx, formDialogPaperSx, formDialogTitleSx } from '../components/FormDialogLayout.tsx';
import {
  bngModels,
  oltLineCardModels,
  oltModels,
  ontModels,
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
  allowCreate?: boolean;
  allowEdit?: boolean;
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

const formatOltModelDisplayName = (model: any, fallback: unknown) =>
  [model?.vendor, model?.name].filter(Boolean).join(' ') || String(fallback);

const commonFields: DeviceModelField[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'vendor', label: 'Vendor', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
];

const deviceModelConfigs: Record<string, DeviceModelConfig> = {
  ont: {
    title: 'ONT Models',
    singular: 'ONT Model',
    queryKey: 'ont-models',
    api: ontModels,
    fields: [
      { name: 'code', label: 'Code', required: true },
      { name: 'olt_match_model', label: 'OLT Match Model', required: true },
      { name: 'name', label: 'Name', required: true },
      { name: 'vendor', label: 'Vendor', required: true },
      { name: 'ont_type', label: 'ONT Type', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
    columns: [
      { id: 'code', label: 'Code' },
      { id: 'olt_match_model', label: 'OLT Match Model' },
      { id: 'name', label: 'Name' },
      { id: 'vendor', label: 'Vendor' },
      { id: 'ont_type', label: 'ONT Type' },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
  },
  olt: {
    title: 'OLT Models',
    singular: 'OLT Model',
    queryKey: 'olt-models',
    allowCreate: false,
    allowEdit: false,
    api: oltModels,
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'vendor', label: 'Vendor', required: true },
      { name: 'modular', label: 'Modular', type: 'boolean' },
      { name: 'number_of_pon_ports', label: 'PON Ports', type: 'number' },
      { name: 'number_of_xgspon_ports', label: 'XGSPON Ports', type: 'number' },
      { name: 'number_of_uplink_ports', label: 'Uplink Ports', type: 'number' },
      { name: 'number_of_line_card_slots', label: 'Line Card Slots', type: 'number' },
      { name: 'number_of_uplink_card_slots', label: 'Uplink Card Slots', type: 'number' },
      { name: 'uplink_line_card_slots_name', label: 'Uplink Slot Names', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'vendor', label: 'Vendor' },
      { id: 'modular', label: 'Modular', format: formatBoolean },
      { id: 'number_of_pon_ports', label: 'PON Ports', format: formatOptional },
      { id: 'number_of_line_card_slots', label: 'Line Card Slots', format: formatOptional },
      { id: 'number_of_uplink_card_slots', label: 'Uplink Card Slots', format: formatOptional },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
  },
  'olt-line-card': {
    title: 'OLT Line Card Models',
    singular: 'OLT Line Card Model',
    queryKey: 'olt-line-card-models',
    allowCreate: false,
    allowEdit: false,
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
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
  },
  'olt-uplink-card': {
    title: 'OLT Uplink Card Models',
    singular: 'OLT Uplink Card Model',
    queryKey: 'olt-uplink-card-models',
    allowCreate: false,
    allowEdit: false,
    api: oltUplinkCardModels,
    fields: [
      ...commonFields.slice(0, 2),
      { name: 'number_of_uplink_port', label: 'Uplink Ports', type: 'number' },
      { name: 'uplink_port_names', label: 'Uplink Port Names', type: 'text' },
      { name: 'olt_model_ids', label: 'Compatible OLT Models', type: 'olt-model-multi-select' },
      commonFields[2],
    ],
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'vendor', label: 'Vendor' },
      { id: 'number_of_uplink_port', label: 'Uplink Ports', format: formatOptional },
      { id: 'description', label: 'Description', format: formatOptional },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
  },
  switch: {
    title: 'Switch Models',
    singular: 'Switch Model',
    queryKey: 'switch-models',
    allowCreate: false,
    allowEdit: false,
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
  bng: {
    title: 'BNG Models',
    singular: 'BNG Model',
    queryKey: 'bng-models',
    allowCreate: false,
    allowEdit: false,
    api: bngModels,
    fields: [
      ...commonFields,
    ],
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'vendor', label: 'Vendor' },
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
  const [viewingUplinkPorts, setViewingUplinkPorts] = useState<string[]>([]);
  const [viewingSupportedOltModels, setViewingSupportedOltModels] = useState<string[]>([]);
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

  const oltModelById = useMemo(
    () => new Map((oltModelsData?.data || []).map((model: any) => [model.id, model])),
    [oltModelsData]
  );

  const oltModelByCode = useMemo(
    () => new Map((oltModelsData?.data || []).map((model: any) => [model.code, model])),
    [oltModelsData]
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

  const openCreateDialog = () => {
    setEditingModel(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const buildModelDetails = useCallback((model: any) => {
    const details = { ...model };

    if (modelType === 'olt') {
      const ports: Record<string, any> = {};
      const slots: Record<string, any> = {};

      if ('number_of_pon_ports' in details) ports.pon_ports = details.number_of_pon_ports;
      if ('number_of_xgspon_ports' in details) ports.xgspon_ports = details.number_of_xgspon_ports;
      if ('number_of_uplink_ports' in details) ports.uplink_ports = details.number_of_uplink_ports;
      if ('number_of_line_card_slots' in details) slots.line_card_slots = details.number_of_line_card_slots;
      if ('number_of_uplink_card_slots' in details) slots.uplink_card_slots = details.number_of_uplink_card_slots;
      if ('uplink_line_card_slots_name' in details) {
        slots.uplink_slot_names = Array.isArray(details.uplink_line_card_slots_name)
          ? details.uplink_line_card_slots_name.join(', ')
          : details.uplink_line_card_slots_name;
      }

      delete details.compatible_olt_models;
      delete details.number_of_pon_ports;
      delete details.number_of_xgspon_ports;
      delete details.number_of_uplink_ports;
      delete details.number_of_line_card_slots;
      delete details.number_of_uplink_card_slots;
      delete details.uplink_line_card_slots_name;

      details.ports = ports;
      details.slots = slots;
    }

    if (modelType === 'ont') {
      delete details.olt_supported_model;
      delete details.olt_supported_models;
      delete details.compatible_olt_models;
    }

    if (modelType === 'switch') {
      delete details.compatible_olt_models;
    }

    if (modelType === 'olt-line-card' || modelType === 'olt-uplink-card') {
      delete details.supported_olt_model_codes;
    }

    if (modelType === 'olt-uplink-card') {
      delete details.uplink_port_names;
    }

    if (modelType === 'olt-line-card' || modelType === 'olt-uplink-card' || modelType === 'bng') {
      delete details.compatible_olt_models;
      delete details.olt_model_ids;
      delete details.olt_model_codes;
    }

    if ('code' in details) {
      const codeValue = details.code;
      delete details.code;
      details.code = codeValue;
    }

    return details;
  }, [modelType]);

  const handleView = (model: any) => {
    const modelWithNames = shouldLoadOltModels
      ? {
          ...model,
          compatible_olt_models: formatOltModelIds(model.olt_model_ids),
        }
      : model;
    setViewingUplinkPorts(
      modelType === 'olt-uplink-card'
        ? (Array.isArray(model.uplink_port_names)
            ? model.uplink_port_names
            : String(model.uplink_port_names || '').split(','))
          .map((port: unknown) => String(port).trim())
          .filter(Boolean)
        : []
    );
    const explicitCodes = Array.isArray(model.olt_model_codes) ? model.olt_model_codes : [];
    const supportedIds = Array.isArray(model.olt_model_ids) ? model.olt_model_ids : [];
    setViewingSupportedOltModels(
      modelType === 'olt-line-card' || modelType === 'olt-uplink-card'
        ? (explicitCodes.length > 0
            ? explicitCodes.map((code) => {
                const supportedModel = oltModelByCode.get(code);
                return formatOltModelDisplayName(supportedModel, code);
              })
            : supportedIds.length > 0
              ? supportedIds.map((supportedId) => {
                  const supportedModel = oltModelById.get(supportedId);
                  return formatOltModelDisplayName(supportedModel, supportedId);
                })
              : ['All OLT models supported'])
          .map((modelCode: unknown) => String(modelCode))
        : []
    );
    setViewingModel(buildModelDetails(modelWithNames));
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

  const renderPortSection = () => {
    if (!viewingModel || modelType !== 'olt-uplink-card') {
      return null;
    }

    const portGroups = [{
      label: 'UPLINK PORTS',
      ports: viewingUplinkPorts,
      fallbackCount: Number(viewingModel.number_of_uplink_port || 0),
      fallbackPrefix: 'xfp',
    }];

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {portGroups.map(({ label, ports, fallbackCount, fallbackPrefix }) => {
          const availablePorts = ports.length > 0
            ? ports
            : Array.from({ length: fallbackCount }, (_, index) => `${fallbackPrefix}${index + 1}`);

          return (
            <Box key={label}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                <MaterialSymbol name="settings_ethernet" sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography
                  variant="caption"
                  sx={{ color: 'primary.dark', fontWeight: 800, letterSpacing: 0.45 }}
                >
                  {label}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {availablePorts.length > 0 ? availablePorts.map((port) => (
                  <Box
                    key={port}
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
                    <MaterialSymbol name="settings_ethernet" sx={{ fontSize: 15 }} />
                    {port}
                  </Box>
                )) : (
                  <Typography variant="body2" color="text.secondary">N/A</Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderSupportedOltModelsSection = () => {
    if (!viewingModel || (modelType !== 'olt-line-card' && modelType !== 'olt-uplink-card')) {
      return null;
    }

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <MaterialSymbol name="dns" sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography
            variant="caption"
            sx={{ color: 'primary.dark', fontWeight: 800, letterSpacing: 0.45 }}
          >
            SUPPORTED OLT MODELS
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {viewingSupportedOltModels.map((modelCode) => (
            <Box
              key={modelCode}
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
              {modelCode}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderCardDetailSections = () => {
    const supportedOltModels = renderSupportedOltModelsSection();
    const ports = renderPortSection();

    if (!supportedOltModels && !ports) return null;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: ports ? { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' } : '1fr',
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        {supportedOltModels}
        {ports}
      </Box>
    );
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
    const fullWidth = field.type === 'textarea' || field.type === 'olt-model-multi-select';

    if (field.type === 'boolean') {
      return (
        <FormDialogItem key={field.name} fullWidth={fullWidth}>
          <TextField
            select
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
        </FormDialogItem>
      );
    }

    if (field.type === 'olt-model-multi-select') {
      const selectedValues = Array.isArray(defaultValue) ? defaultValue : [];

      return (
        <FormDialogItem key={field.name} fullWidth={fullWidth}>
          <TextField
            select
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
        </FormDialogItem>
      );
    }

    return (
      <FormDialogItem key={field.name} fullWidth={fullWidth}>
        <TextField
          autoFocus={index === 0}
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
      </FormDialogItem>
    );
  };

  if (!config) {
    return <Navigate to="/device-models/olt" replace />;
  }

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
        {config.allowCreate !== false && (
          <Button variant="contained" color="primary" onClick={openCreateDialog}>
            Add {config.singular}
          </Button>
        )}
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
        onEdit={config.allowEdit === false ? undefined : handleEdit}
      />

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: formDialogPaperSx }}>
        <form onSubmit={handleSave}>
          <DialogTitle sx={formDialogTitleSx}>
            {editingModel ? `Edit ${config.singular}` : `Create New ${config.singular}`}
          </DialogTitle>
          <DialogContent sx={formDialogContentSx}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {formError}
              </Alert>
            )}
            <FormDialogGrid>
              {config.fields.map(renderField)}
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
        title={`${config.singular} Details`}
        data={viewingModel}
        extraContent={renderCardDetailSections()}
        extraContentBeforeMetadata
        extraContentInMainCard
      />
    </Layout>
  );
};

export default DeviceModels;

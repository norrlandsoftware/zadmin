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
  TextField,
  Typography,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import MaterialSymbol from '../components/MaterialSymbol.tsx';
import { FormDialogGrid, FormDialogItem, formDialogActionsSx, formDialogContentSx, formDialogPaperSx, formDialogTitleSx } from '../components/FormDialogLayout.tsx';
import { configTemplates, oltModels } from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

const formatOptional = (value: string | null | undefined) =>
  value === null || value === undefined || value === '' ? 'N/A' : value;

const formatOltModelDisplayName = (model: any, fallback: unknown) =>
  [model?.vendor, model?.name].filter(Boolean).join(' ') || String(fallback);

const getErrorMessage = (error: any) =>
  error?.response?.data?.detail?.[0]?.msg ||
  error?.response?.data?.message ||
  'Unable to save config template.';

const nullableString = (value: FormDataEntryValue | null) => {
  if (value === null || value === '') {
    return null;
  }

  return String(value);
};

const getTemplateText = (template: any) =>
  template?.body ?? template?.template ?? '';

const normalizeTemplateForDetails = (template: any) => {
  const normalized = { ...template };
  delete normalized.olt_model_codes;
  delete normalized.olt_model_ids;
  delete normalized.model;
  delete normalized.models;
  delete normalized.is_active;
  return normalized;
};

const ConfigTemplates: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [viewingTemplate, setViewingTemplate] = useState<any>(null);
  const [viewingSupportedOltModels, setViewingSupportedOltModels] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [templateBody, setTemplateBody] = useState('');

  const { data, isLoading, refetch } = useQuery(
    ['config-templates', page, rowsPerPage],
    () => configTemplates.getAll({ page: page + 1, size: rowsPerPage, sort: UPDATED_AT_DESC_SORT })
  );

  const { data: oltModelsData } = useQuery(
    ['config-templates-olt-models'],
    () => oltModels.getAll({ size: 1000, sort: 'name' })
  );

  const oltModelByCode = useMemo(
    () => new Map((oltModelsData?.data || []).map((model: any) => [model.code, model])),
    [oltModelsData]
  );

  const oltModelById = useMemo(
    () => new Map((oltModelsData?.data || []).map((model: any) => [model.id, model])),
    [oltModelsData]
  );

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormError(null);
    setTemplateBody('');
    setDialogOpen(true);
  };

  const handleView = (template: any) => {
    const codes = Array.isArray(template.olt_model_codes)
      ? template.olt_model_codes
      : String(template.olt_model_codes || '').split(',').map((code) => code.trim()).filter(Boolean);
    const ids = Array.isArray(template.olt_model_ids)
      ? template.olt_model_ids
      : String(template.olt_model_ids || '').split(',').map((id) => id.trim()).filter(Boolean);
    const models = Array.isArray(template.models)
      ? template.models
      : String(template.models || '').split(',').map((model) => model.trim()).filter(Boolean);
    setViewingSupportedOltModels(
      (codes.length > 0
        ? codes.map((code: string) => formatOltModelDisplayName(oltModelByCode.get(code), code))
        : ids.length > 0
          ? ids.map((id: string) => formatOltModelDisplayName(oltModelById.get(id), id))
          : models.length > 0
            ? models.map((model: any) => {
                if (typeof model === 'object' && model !== null) {
                  return formatOltModelDisplayName(
                    model.name ? model : oltModelByCode.get(model.code) || oltModelById.get(model.id),
                    model.code || model.id
                  );
                }
                return formatOltModelDisplayName(oltModelByCode.get(model) || oltModelById.get(model), model);
              })
          : String(template.model || '').split(',').map((code) => code.trim()).filter(Boolean)
            .map((code) => formatOltModelDisplayName(oltModelByCode.get(code), code)))
        .map((modelName: unknown) => String(modelName))
    );
    setViewingTemplate(normalizeTemplateForDetails(template));
    setDetailDialogOpen(true);
  };

  const renderSupportedOltModels = () => {
    if (!viewingTemplate || viewingSupportedOltModels.length === 0) return null;

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <MaterialSymbol name="dns" sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="caption" sx={{ color: 'primary.dark', fontWeight: 800, letterSpacing: 0.45 }}>
            SUPPORTED OLT MODELS
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {viewingSupportedOltModels.map((modelName) => (
            <Box
              key={modelName}
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
              {modelName}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const handleEdit = async (template: any) => {
    setFormError(null);
    try {
      const fullTemplate = await configTemplates.getById(template.id);
      setEditingTemplate(fullTemplate);
      setTemplateBody(getTemplateText(fullTemplate));
      setDialogOpen(true);
    } catch (error: any) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormError(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.target as HTMLFormElement);
    const payload = {
      name: formData.get('name'),
      description: nullableString(formData.get('description')),
      body: nullableString(templateBody),
      template: nullableString(templateBody),
    };

    try {
      if (editingTemplate) {
        await configTemplates.update(editingTemplate.id, payload);
      } else {
        await configTemplates.create(payload);
      }

      await refetch();
      handleClose();
    } catch (error: any) {
      setFormError(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <Layout title="Config Templates">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="Config Templates">
      <Box sx={{ mb: 4 }}>
        <Button variant="contained" color="primary" onClick={openCreateDialog}>
          Add Config Template
        </Button>
      </Box>

      <DataTable
        columns={[
          { id: 'name', label: 'Name' },
          { id: 'type', label: 'Type', format: formatOptional },
          { id: 'description', label: 'Description', format: formatOptional },
          { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
        ]}
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
            {editingTemplate ? 'Edit Config Template' : 'Create New Config Template'}
          </DialogTitle>
          <DialogContent sx={formDialogContentSx}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {formError}
              </Alert>
            )}
            <FormDialogGrid>
              <FormDialogItem><TextField autoFocus name="name" label="Name" type="text" fullWidth defaultValue={editingTemplate?.name || ''} required /></FormDialogItem>
              <FormDialogItem><TextField name="description" label="Description" type="text" fullWidth defaultValue={editingTemplate?.description || ''} /></FormDialogItem>
              <FormDialogItem fullWidth><TextField name="body_preview" label="Template" type="text" fullWidth multiline rows={10} value={templateBody} onChange={(event) => setTemplateBody(event.target.value)} InputProps={{ sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: '0.8125rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' } }} /></FormDialogItem>
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
        title="Config Template Details"
        data={viewingTemplate}
        fullWidthFields={['body', 'template']}
        preformattedFields={['body', 'template']}
        extraContent={renderSupportedOltModels()}
        extraContentBeforeMetadata
        extraContentInMainCard
      />
    </Layout>
  );
};

export default ConfigTemplates;

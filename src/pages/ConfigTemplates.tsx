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
import { configTemplates } from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

const formatOptional = (value: string | null | undefined) =>
  value === null || value === undefined || value === '' ? 'N/A' : value;

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
  if (Array.isArray(normalized.olt_model_codes)) {
    normalized.olt_model_codes = normalized.olt_model_codes.join(', ');
  }
  if (Array.isArray(normalized.olt_model_ids)) {
    normalized.olt_model_ids = normalized.olt_model_ids.join(', ');
  }
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
  const [formError, setFormError] = useState<string | null>(null);
  const [templateBody, setTemplateBody] = useState('');

  const { data, isLoading, refetch } = useQuery(
    ['config-templates', page, rowsPerPage],
    () => configTemplates.getAll({ page: page + 1, size: rowsPerPage, sort: UPDATED_AT_DESC_SORT })
  );

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormError(null);
    setTemplateBody('');
    setDialogOpen(true);
  };

  const handleView = (template: any) => {
    setViewingTemplate(normalizeTemplateForDetails(template));
    setDetailDialogOpen(true);
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

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editingTemplate ? 'Edit Config Template' : 'Create New Config Template'}
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
              defaultValue={editingTemplate?.name || ''}
              required
            />
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              defaultValue={editingTemplate?.description || ''}
            />
            <TextField
              margin="dense"
              name="body_preview"
              label="Template"
              type="text"
              fullWidth
              multiline
              rows={10}
              value={templateBody}
              onChange={(event) => setTemplateBody(event.target.value)}
              InputProps={{
                sx: {
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: '0.8125rem',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                },
              }}
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
        title="Config Template Details"
        data={viewingTemplate}
        fullWidthFields={['body', 'template']}
        preformattedFields={['body', 'template']}
      />
    </Layout>
  );
};

export default ConfigTemplates;

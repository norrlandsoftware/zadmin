import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import { emailTemplates } from '../services/api.ts';

const templateTypes = ['new_user', 'reset_password', 'generic'];

const columns = [
  { id: 'name', label: 'Name' },
  { id: 'type', label: 'Type', format: (value: string) => value || 'N/A' },
  { id: 'subject', label: 'Subject', format: (value: string) => value || 'N/A' },
  {
    id: 'is_active',
    label: 'Active',
    format: (value: boolean) => (value ? 'Yes' : 'No'),
  },
];

const EmailTemplates: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [viewingTemplate, setViewingTemplate] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(
    ['email-templates', page, rowsPerPage],
    () => emailTemplates.getAll({ page: page + 1, size: rowsPerPage })
  );

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleView = (template: any) => {
    setViewingTemplate(template);
    setDetailDialogOpen(true);
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormError(null);
    setDialogOpen(true);
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
    const data = Object.fromEntries(formData.entries());

    const payload = {
      ...data,
      is_active: formData.get('is_active') === 'on',
    };

    try {
      if (editingTemplate) {
        await emailTemplates.update(editingTemplate.id, payload);
      } else {
        await emailTemplates.create(payload);
      }

      await refetch();
      handleClose();
    } catch (error: any) {
      setFormError(
        error?.response?.data?.detail?.[0]?.msg ||
          error?.response?.data?.message ||
          'Unable to save email template.'
      );
    }
  };

  if (isLoading) {
    return (
      <Layout title="Email Templates">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="Email Templates">
      <Box sx={{ mb: 4 }}>
        <Button variant="contained" color="primary" onClick={openCreateDialog}>
          Add Email Template
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

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editingTemplate ? 'Edit Email Template' : 'Create New Email Template'}
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
              select
              margin="dense"
              name="type"
              label="Type"
              fullWidth
              defaultValue={editingTemplate?.type || 'generic'}
              required
            >
              {templateTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
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
              name="subject"
              label="Subject"
              type="text"
              fullWidth
              defaultValue={editingTemplate?.subject || ''}
            />
            <TextField
              margin="dense"
              name="body"
              label="Body"
              multiline
              minRows={10}
              fullWidth
              defaultValue={editingTemplate?.body || ''}
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="is_active"
                  defaultChecked={editingTemplate?.is_active ?? true}
                />
              }
              label="Active"
              sx={{ mt: 1 }}
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
        title="Email Template Details"
        data={viewingTemplate}
      />
    </Layout>
  );
};

export default EmailTemplates;

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import { users } from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

const availableRoles = ['admin', 'bss', 'discoverer'];

const columns = [
  { id: 'full_name', label: 'Full Name', format: (value: string) => value || 'N/A' },
  { id: 'email', label: 'Email' },
  { id: 'role', label: 'Role', format: (value: string) => value || 'N/A' },
  { id: 'is_active', label: 'Active', format: (value: boolean) => value ? 'Yes' : 'No' },
  { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
];

const Users: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(['users', page, rowsPerPage], () =>
    users.getAll({ page: page + 1, size: rowsPerPage, sort: UPDATED_AT_DESC_SORT })
  );

  const handleView = (user: any) => {
    // Remove password from view data
    const { password, ...userWithoutPassword } = user;
    setViewingUser(userWithoutPassword);
    setDetailDialogOpen(true);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormError(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    const formData = new FormData(event.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    const payload = {
      full_name: data.full_name,
      email: data.email,
      role: data.role || null,
    };

    try {
      if (editingUser) {
        await users.update(editingUser.id, payload);
      } else {
        await users.create(payload);
        setSuccessMessage('The user has been created and a welcome email has been sent to the new user');
      }
      refetch();
      handleClose();
    } catch (error: any) {
      setFormError(
        error?.response?.data?.detail?.[0]?.msg ||
          error?.response?.data?.message ||
          'Unable to save user.'
      );
    }
  };

  if (isLoading) {
    return (
      <Layout title="Users">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="Users">
      <Box sx={{ mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setDialogOpen(true)}
        >
          Add New User
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

      <Dialog open={dialogOpen} onClose={handleClose}>
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Create New User'}
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
              name="full_name"
              label="Full Name"
              type="text"
              fullWidth
              defaultValue={editingUser?.full_name || ''}
              required
            />
            <TextField
              margin="dense"
              name="email"
              label="Email"
              type="email"
              fullWidth
              defaultValue={editingUser?.email || ''}
              required
            />
            <TextField
              select
              margin="dense"
              name="role"
              label="Role"
              fullWidth
              defaultValue={editingUser?.role || ''}
              required
            >
              {availableRoles.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
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

      <Dialog open={!!successMessage} onClose={() => setSuccessMessage(null)} maxWidth="xs" fullWidth>
        <DialogTitle>User Created</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mt: 1 }}>
            {successMessage}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessMessage(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <DetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        title="User Details"
        data={viewingUser}
      />
    </Layout>
  );
};

export default Users;

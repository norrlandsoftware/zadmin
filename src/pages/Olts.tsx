import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  MenuItem,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import { olts, pops } from '../services/api.ts';

const columns = [
  { id: 'name', label: 'Name' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'model', label: 'Model' },
  { id: 'ip_address_v4', label: 'IP Address' },
];

const Olts: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingOlt, setEditingOlt] = useState<any>(null);
  const [viewingOlt, setViewingOlt] = useState<any>(null);
  const [searchName, setSearchName] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
      ...(debouncedSearch && { q: `name[regex]:${debouncedSearch}` })
    }),
    {
      keepPreviousData: true,
    }
  );

  const { data: popsData } = useQuery(['pops'], () => pops.getAll());

  const handleView = (olt: any) => {
    // Find the POP name from the popsData
    const popName = popsData?.data.find((pop: any) => pop.id === olt.pop_id)?.name;
    
    // Create a modified version of the OLT data with pop_name instead of pop_id
    const oltWithPopName = {
      ...olt,
      pop_name: popName || 'N/A',
    };
    
    // Remove pop_id from the display
    delete oltWithPopName.pop_id;
    
    setViewingOlt(oltWithPopName);
    setDetailDialogOpen(true);
  };

  const handleEdit = (olt: any) => {
    setEditingOlt(olt);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingOlt(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      if (editingOlt) {
        await olts.update(editingOlt.id, data);
      } else {
        await olts.create(data);
      }
      refetch();
      handleClose();
    } catch (error) {
      console.error('Error saving OLT:', error);
    }
  };

  if (isLoading && !data) {
    return (
      <Layout>
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Optical Line Terminals
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
          <TextField
            placeholder="Search by Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchName && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchName('')}
                    edge="end"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => setDialogOpen(true)}
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
        onEdit={handleEdit}
      />

      <Dialog open={dialogOpen} onClose={handleClose}>
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editingOlt ? 'Edit OLT' : 'Create New OLT'}
          </DialogTitle>
          <DialogContent>
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
              margin="dense"
              name="vendor"
              label="Vendor"
              type="text"
              fullWidth
              defaultValue={editingOlt?.vendor || ''}
            />
            <TextField
              margin="dense"
              name="model"
              label="Model"
              type="text"
              fullWidth
              defaultValue={editingOlt?.model || ''}
            />
            <TextField
              margin="dense"
              name="software_version"
              label="Software Version"
              type="text"
              fullWidth
              defaultValue={editingOlt?.software_version || ''}
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
            <TextField
              margin="dense"
              name="username"
              label="Username"
              type="text"
              fullWidth
              defaultValue={editingOlt?.username || ''}
              required
            />
            <TextField
              margin="dense"
              name="password"
              label="Password"
              type="password"
              fullWidth
              defaultValue={editingOlt?.password || ''}
              required
            />
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              defaultValue={editingOlt?.description || ''}
            />
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
      />
    </Layout>
  );
};

export default Olts;
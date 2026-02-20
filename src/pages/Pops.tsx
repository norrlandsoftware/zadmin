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
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import PopMap from '../components/PopMap.tsx';
import { pops } from '../services/api.ts';

const columns = [
  { id: 'name', label: 'Name' },
  { id: 'address', label: 'Address' },
  { id: 'city', label: 'City' },
  { id: 'country', label: 'Country' },
];

const Pops: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingPop, setEditingPop] = useState<any>(null);
  const [viewingPop, setViewingPop] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);
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
    ['pops', page, rowsPerPage, debouncedSearch], 
    () => pops.getAll({ 
      page: page + 1, 
      size: rowsPerPage,
      ...(debouncedSearch && { q: `name[regex]:${debouncedSearch}` })
    }),
    {
      keepPreviousData: true,
    }
  );

  const handleView = (pop: any) => {
    setViewingPop(pop);
    setDetailDialogOpen(true);
  };

  const handleEdit = (pop: any) => {
    setEditingPop(pop);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingPop(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      if (editingPop) {
        await pops.update(editingPop.id, data);
      } else {
        await pops.create(data);
      }
      refetch();
      handleClose();
    } catch (error) {
      console.error('Error saving POP:', error);
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
          Points of Presence
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
            Add New POP
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="List View" />
          <Tab label="Map View" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
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
      )}

      {tabValue === 1 && (
        <PopMap
          pops={data?.data || []}
          onPopClick={handleView}
        />
      )}

      <Dialog open={dialogOpen} onClose={handleClose}>
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editingPop ? 'Edit POP' : 'Create New POP'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Name"
              type="text"
              fullWidth
              defaultValue={editingPop?.name || ''}
              required
            />
            <TextField
              margin="dense"
              name="address"
              label="Address"
              type="text"
              fullWidth
              defaultValue={editingPop?.address || ''}
              required
            />
            <TextField
              margin="dense"
              name="postal_code"
              label="Postal Code"
              type="text"
              fullWidth
              defaultValue={editingPop?.postal_code || ''}
            />
            <TextField
              margin="dense"
              name="city"
              label="City"
              type="text"
              fullWidth
              defaultValue={editingPop?.city || ''}
              required
            />
            <TextField
              margin="dense"
              name="province"
              label="Province"
              type="text"
              fullWidth
              defaultValue={editingPop?.province || ''}
            />
            <TextField
              margin="dense"
              name="country"
              label="Country"
              type="text"
              fullWidth
              defaultValue={editingPop?.country || ''}
              required
            />
            <TextField
              margin="dense"
              name="latitude"
              label="Latitude"
              type="text"
              fullWidth
              defaultValue={editingPop?.latitude || ''}
            />
            <TextField
              margin="dense"
              name="longitude"
              label="Longitude"
              type="text"
              fullWidth
              defaultValue={editingPop?.longitude || ''}
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
        title="POP Details"
        data={viewingPop}
      />
    </Layout>
  );
};

export default Pops;
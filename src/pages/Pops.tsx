import React, { useState, useEffect } from 'react';
import MaterialSymbol from '../components/MaterialSymbol.tsx';
import { useQuery } from '@tanstack/react-query';
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
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import PopMap from '../components/PopMap.tsx';
import { FormDialogGrid, FormDialogItem, formDialogActionsSx, formDialogContentSx, formDialogPaperSx, formDialogTitleSx } from '../components/FormDialogLayout.tsx';
import { pops } from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

const columns = [
  { id: 'name', label: 'Name' },
  { id: 'address', label: 'Address' },
  { id: 'city', label: 'City' },
  { id: 'country', label: 'Country' },
  { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
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
  const [popForm, setPopForm] = useState<Record<string, string>>({});
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

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
      sort: UPDATED_AT_DESC_SORT,
      ...(debouncedSearch && { q: `name[regex]:${debouncedSearch}` })
    }),
    {
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    const openPopId = location.state?.openPopId;
    const openPopData = location.state?.openPopData;

    if (openPopData) {
      setTabValue(0);
      setViewingPop(openPopData);
      setDetailDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    if (!openPopId || !data?.data) {
      return;
    }

    const matchedPop = data.data.find((pop: any) => pop.id === openPopId);
    if (!matchedPop) {
      return;
    }

    setTabValue(0);
    setViewingPop(matchedPop);
    setDetailDialogOpen(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [data, location.pathname, location.state, navigate]);

  const handleView = (pop: any) => {
    setViewingPop(pop);
    setDetailDialogOpen(true);
  };

  const handleEdit = (pop: any) => {
    setEditingPop(pop);
    setPopForm({
      name: pop?.name || '',
      address: pop?.address || '',
      postal_code: pop?.postal_code || '',
      city: pop?.city || '',
      province: pop?.province || '',
      country: pop?.country || '',
      latitude: pop?.latitude || '',
      longitude: pop?.longitude || '',
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPop(null);
    setPopForm({
      name: '',
      address: '',
      postal_code: '',
      city: '',
      province: '',
      country: '',
      latitude: '',
      longitude: '',
    });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingPop(null);
    setPopForm({});
    setGeocodeError(null);
    setGeocodeLoading(false);
  };

  useEffect(() => {
    if (!dialogOpen || Boolean(editingPop)) return;

    const address = popForm.address?.trim();
    const city = popForm.city?.trim();
    const country = popForm.country?.trim();
    const latitude = popForm.latitude?.trim();
    const longitude = popForm.longitude?.trim();

    if (!address || !city || !country) {
      setGeocodeError(null);
      return;
    }

    if (latitude && longitude) {
      setGeocodeError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setGeocodeLoading(true);
      setGeocodeError(null);

      try {
        const query = encodeURIComponent([address, city, country].join(', '));
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`);
        const results = await response.json();
        const firstResult = Array.isArray(results) ? results[0] : null;

        if (!firstResult?.lat || !firstResult?.lon) {
          setGeocodeError('Unable to resolve this address.');
          return;
        }

        setPopForm((current) => ({
          ...current,
          latitude: String(firstResult.lat),
          longitude: String(firstResult.lon),
        }));
      } catch (_error) {
        setGeocodeError('Address lookup failed. Please enter coordinates manually.');
      } finally {
        setGeocodeLoading(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [dialogOpen, editingPop, popForm.address, popForm.city, popForm.country, popForm.latitude, popForm.longitude]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = { ...popForm };

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
      <Layout title="Points of Presence">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="Points of Presence">
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
            onClick={handleCreate}
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

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: formDialogPaperSx }}>
        <form onSubmit={handleSave}>
          <DialogTitle sx={formDialogTitleSx}>
            {editingPop ? 'Edit POP' : 'Create New POP'}
          </DialogTitle>
          <DialogContent sx={formDialogContentSx}>
            <FormDialogGrid>
              <FormDialogItem><TextField autoFocus name="name" label="Name" type="text" fullWidth value={popForm.name || ''} onChange={(e) => setPopForm((current) => ({ ...current, name: e.target.value }))} required /></FormDialogItem>
              <FormDialogItem><TextField name="address" label="Address" type="text" fullWidth value={popForm.address || ''} onChange={(e) => setPopForm((current) => ({ ...current, address: e.target.value }))} required /></FormDialogItem>
              <FormDialogItem><TextField name="postal_code" label="Postal Code" type="text" fullWidth value={popForm.postal_code || ''} onChange={(e) => setPopForm((current) => ({ ...current, postal_code: e.target.value }))} /></FormDialogItem>
              <FormDialogItem><TextField name="city" label="City" type="text" fullWidth value={popForm.city || ''} onChange={(e) => setPopForm((current) => ({ ...current, city: e.target.value }))} required /></FormDialogItem>
              <FormDialogItem><TextField name="province" label="Province" type="text" fullWidth value={popForm.province || ''} onChange={(e) => setPopForm((current) => ({ ...current, province: e.target.value }))} /></FormDialogItem>
              <FormDialogItem><TextField name="country" label="Country" type="text" fullWidth value={popForm.country || ''} onChange={(e) => setPopForm((current) => ({ ...current, country: e.target.value }))} required /></FormDialogItem>
              <FormDialogItem><TextField name="latitude" label="Latitude" type="text" fullWidth value={popForm.latitude || ''} onChange={(e) => setPopForm((current) => ({ ...current, latitude: e.target.value }))} helperText={geocodeLoading ? 'Resolving address...' : geocodeError || ' '} error={Boolean(geocodeError)} /></FormDialogItem>
              <FormDialogItem><TextField name="longitude" label="Longitude" type="text" fullWidth value={popForm.longitude || ''} onChange={(e) => setPopForm((current) => ({ ...current, longitude: e.target.value }))} /></FormDialogItem>
            </FormDialogGrid>
            {popForm.latitude && popForm.longitude && !Number.isNaN(Number(popForm.latitude)) && !Number.isNaN(Number(popForm.longitude)) && (
              <Box sx={{ mt: 2 }}>
                <PopMap
                  pops={[
                    {
                      id: 'preview',
                      name: popForm.name || 'POP Location',
                      address: popForm.address,
                      city: popForm.city,
                      country: popForm.country,
                      latitude: Number(popForm.latitude),
                      longitude: Number(popForm.longitude),
                    },
                  ]}
                  height={240}
                  draggableMarkers
                  onMarkerDragEnd={(_pop, latitude, longitude) =>
                    setPopForm((current) => ({
                      ...current,
                      latitude: latitude.toFixed(6),
                      longitude: longitude.toFixed(6),
                    }))
                  }
                />
              </Box>
            )}
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
        title="POP Details"
        data={viewingPop}
      />
    </Layout>
  );
};

export default Pops;

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
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import { onts, olts } from '../services/api.ts';

const columns = [
  { id: 'serial_number', label: 'Serial Number' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'model', label: 'Model' },
  { 
    id: 'admin_status', 
    label: 'Admin Status',
    format: (value: any, row: any) => {
      const isAllGreen = 
        row.admin_status?.toLowerCase() === 'configure' &&
        row.operational_status?.toLowerCase() === 'configured' &&
        row.notified_to_bss === true;
      return (
        <span style={{ color: isAllGreen ? 'green' : 'inherit' }}>
          {value || 'N/A'}
        </span>
      );
    }
  },
  { 
    id: 'operational_status', 
    label: 'Operational Status',
    format: (value: any, row: any) => {
      const isAllGreen = 
        row.admin_status?.toLowerCase() === 'configure' &&
        row.operational_status?.toLowerCase() === 'configured' &&
        row.notified_to_bss === true;
      return (
        <span style={{ color: isAllGreen ? 'green' : 'inherit' }}>
          {value || 'N/A'}
        </span>
      );
    }
  },
  { 
    id: 'notified_to_bss', 
    label: 'Notified To BSS',
    format: (value: any, row: any) => {
      const displayValue = value === true ? 'Yes' : value === false ? 'No' : value || 'N/A';
      const isAllGreen = 
        row.admin_status?.toLowerCase() === 'configure' &&
        row.operational_status?.toLowerCase() === 'configured' &&
        row.notified_to_bss === true;
      return (
        <span style={{ color: isAllGreen ? 'green' : 'inherit' }}>
          {displayValue}
        </span>
      );
    }
  },
];

const Onts: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [troubleshootDialogOpen, setTroubleshootDialogOpen] = useState(false);
  const [editingOnt, setEditingOnt] = useState<any>(null);
  const [viewingOnt, setViewingOnt] = useState<any>(null);
  const [troubleshootingOnt, setTroubleshootingOnt] = useState<any>(null);
  const [searchSerial, setSearchSerial] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [confirmStartTroubleshoot, setConfirmStartTroubleshoot] = useState(false);
  const [isStartingTroubleshoot, setIsStartingTroubleshoot] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchSerial);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchSerial]);

  const { data, isLoading, refetch } = useQuery(
    ['onts', page, rowsPerPage, debouncedSearch], 
    () => onts.getAll({ 
      page: page + 1, 
      size: rowsPerPage,
      ...(debouncedSearch && { q: `serial_number[regex]:${debouncedSearch}` })
    }),
    {
      keepPreviousData: true,
    }
  );

  const { data: oltsData } = useQuery(['olts'], () => olts.getAll());

  const { data: troubleshootData, isLoading: troubleshootLoading, refetch: refetchTroubleshoots } = useQuery(
    ['troubleshoots', troubleshootingOnt?.serial_number],
    () => onts.getTroubleshoots(troubleshootingOnt?.serial_number),
    {
      enabled: !!troubleshootingOnt?.serial_number && troubleshootDialogOpen,
    }
  );

  const handleView = (ont: any) => {
    // Find the OLT name from the oltsData
    const oltName = oltsData?.data.find((olt: any) => olt.id === ont.olt_id)?.name;
    
    // Create a modified version of the ONT data with olt_name instead of olt_id
    const ontWithOltName = {
      ...ont,
      olt_name: oltName || 'N/A',
    };
    
    // Remove olt_id from the display
    delete ontWithOltName.olt_id;
    
    setViewingOnt(ontWithOltName);
    setDetailDialogOpen(true);
  };

  const handleEdit = (ont: any) => {
    setEditingOnt(ont);
    setDialogOpen(true);
  };

  const handleTroubleshoot = (ont: any) => {
    setTroubleshootingOnt(ont);
    setExpandedRows(new Set());
    setTroubleshootDialogOpen(true);
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingOnt(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      if (editingOnt) {
        await onts.update(editingOnt.id, data);
      } else {
        await onts.create(data);
      }
      refetch();
      handleClose();
    } catch (error) {
      console.error('Error saving ONT:', error);
    }
  };

  const handleStartTroubleshoot = async () => {
    setConfirmStartTroubleshoot(false);
    setIsStartingTroubleshoot(true);
    
    try {
      await onts.startTroubleshoot(troubleshootingOnt?.serial_number);
      
      // Refetch troubleshoot data after starting a new one
      const result = await refetchTroubleshoots();
      
      // Expand the most recent troubleshoot (first in the sorted list)
      if (result.data?.data && result.data.data.length > 0) {
        const sortedData = [...result.data.data].sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const mostRecentId = sortedData[0].id;
        setExpandedRows(new Set([mostRecentId]));
      }
    } catch (error) {
      console.error('Error starting troubleshoot:', error);
    } finally {
      setIsStartingTroubleshoot(false);
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
          Optical Network Terminals
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
          <TextField
            placeholder="Search by Serial Number"
            value={searchSerial}
            onChange={(e) => setSearchSerial(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchSerial && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchSerial('')}
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
            Add New ONT
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
        onTroubleshoot={handleTroubleshoot}
        onEdit={handleEdit}
      />

      <Dialog open={dialogOpen} onClose={handleClose}>
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editingOnt ? 'Edit ONT' : 'Create New ONT'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="serial_number"
              label="Serial Number"
              type="text"
              fullWidth
              defaultValue={editingOnt?.serial_number || ''}
              required
            />
            <TextField
              margin="dense"
              name="vendor"
              label="Vendor"
              type="text"
              fullWidth
              defaultValue={editingOnt?.vendor || ''}
            />
            <TextField
              margin="dense"
              name="model"
              label="Model"
              type="text"
              fullWidth
              defaultValue={editingOnt?.model || ''}
            />
            <TextField
              select
              margin="dense"
              name="olt_id"
              label="OLT"
              fullWidth
              defaultValue={editingOnt?.olt_id || ''}
              required
            >
              {oltsData?.data.map((olt: any) => (
                <MenuItem key={olt.id} value={olt.id}>
                  {olt.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              margin="dense"
              name="port"
              label="Port"
              type="text"
              fullWidth
              defaultValue={editingOnt?.port || ''}
              required
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
        title="ONT Details"
        data={viewingOnt}
      />

      <Dialog open={troubleshootDialogOpen} onClose={() => setTroubleshootDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
              ONT Troubleshooting History
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setConfirmStartTroubleshoot(true)}
              disabled={isStartingTroubleshoot}
            >
              Start Troubleshoot
            </Button>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Troubleshooting history for ONT: <strong>{troubleshootingOnt?.serial_number}</strong>
          </Typography>
          
          {isStartingTroubleshoot ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 5 }}>
              <CircularProgress size={60} />
              <Typography variant="body1" sx={{ mt: 2 }}>
                Starting troubleshoot...
              </Typography>
            </Box>
          ) : troubleshootLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : troubleshootData?.data && troubleshootData.data.length > 0 ? (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }} />
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date & Time</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Margin</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Link Quality</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {troubleshootData.data
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((troubleshoot: any) => {
                      const isExpanded = expandedRows.has(troubleshoot.id);
                      return (
                        <React.Fragment key={troubleshoot.id}>
                          <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                            <TableCell sx={{ width: 50 }}>
                              <IconButton
                                size="small"
                                onClick={() => toggleRow(troubleshoot.id)}
                              >
                                {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                              </IconButton>
                            </TableCell>
                            <TableCell>{new Date(troubleshoot.created_at).toLocaleString()}</TableCell>
                            <TableCell>{troubleshoot.margin ?? 'N/A'}</TableCell>
                            <TableCell>{troubleshoot.link_quality ?? 'N/A'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ margin: 1 }}>
                                  {/* General Information Section */}
                                  <Typography variant="subtitle2" gutterBottom component="div" color="primary" sx={{ mt: 1, mb: 1 }}>
                                    General Information
                                  </Typography>
                                  <Grid container spacing={1} sx={{ mb: 2 }}>
                                    {['serial_number', 'olt_ip_address', 'ont_port', 'ont_admin_status', 'ont_operational_status'].map((key) => {
                                      const value = troubleshoot[key];
                                      if (value === undefined) return null;
                                      return (
                                        <Grid item xs={12} sm={6} md={3} key={key}>
                                          <Box>
                                            <Typography 
                                              variant="caption" 
                                              color="primary.main"
                                              sx={{ 
                                                fontWeight: 600, 
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                                display: 'block',
                                                mb: 0.3,
                                                fontSize: '0.7rem'
                                              }}
                                            >
                                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </Typography>
                                            <Box 
                                              sx={{ 
                                                p: 0.5,
                                                border: 1,
                                                borderColor: 'divider',
                                                borderRadius: 1,
                                                transition: 'border-color 0.2s',
                                                '&:hover': {
                                                  borderColor: 'primary.main',
                                                }
                                              }}
                                            >
                                              <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                  wordBreak: 'break-word',
                                                  color: value ? 'text.primary' : 'text.disabled',
                                                  fontSize: '0.8rem'
                                                }}
                                              >
                                                {value !== null && value !== undefined ? String(value) : 'N/A'}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Grid>
                                      );
                                    })}
                                  </Grid>

                                  {/* Optical Section */}
                                  <Typography variant="subtitle2" gutterBottom component="div" color="primary" sx={{ mt: 1, mb: 1 }}>
                                    Optical
                                  </Typography>
                                  <Grid container spacing={1} sx={{ mb: 2 }}>
                                    {['distance', 'olt_rx_level', 'ont_rx_level', 'ont_tx_level', 'expected_loss', 'actual_loss', 'margin', 'link_quality'].map((key) => {
                                      const value = troubleshoot[key];
                                      if (value === undefined) return null;
                                      return (
                                        <Grid item xs={12} sm={6} md={3} key={key}>
                                          <Box>
                                            <Typography 
                                              variant="caption" 
                                              color="primary.main"
                                              sx={{ 
                                                fontWeight: 600, 
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                                display: 'block',
                                                mb: 0.3,
                                                fontSize: '0.7rem'
                                              }}
                                            >
                                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </Typography>
                                            <Box 
                                              sx={{ 
                                                p: 0.5,
                                                border: 1,
                                                borderColor: 'divider',
                                                borderRadius: 1,
                                                transition: 'border-color 0.2s',
                                                '&:hover': {
                                                  borderColor: 'primary.main',
                                                }
                                              }}
                                            >
                                              <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                  wordBreak: 'break-word',
                                                  color: value ? 'text.primary' : 'text.disabled',
                                                  fontSize: '0.8rem'
                                                }}
                                              >
                                                {value !== null && value !== undefined ? String(value) : 'N/A'}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Grid>
                                      );
                                    })}
                                  </Grid>

                                  {/* Radius Section */}
                                  {troubleshoot.radius && (
                                    <>
                                      <Typography variant="subtitle2" gutterBottom component="div" color="primary" sx={{ mt: 1, mb: 1 }}>
                                        Radius
                                      </Typography>
                                      <Grid container spacing={1} sx={{ mb: 2 }}>
                                        {Object.entries(troubleshoot.radius).map(([key, value]) => (
                                          <Grid item xs={12} sm={6} md={3} key={key}>
                                            <Box>
                                              <Typography 
                                                variant="caption" 
                                                color="primary.main"
                                                sx={{ 
                                                  fontWeight: 600, 
                                                  textTransform: 'uppercase',
                                                  letterSpacing: 0.5,
                                                  display: 'block',
                                                  mb: 0.3,
                                                  fontSize: '0.7rem'
                                                }}
                                              >
                                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                              </Typography>
                                              <Box 
                                                sx={{ 
                                                  p: 0.5,
                                                  border: 1,
                                                  borderColor: 'divider',
                                                  borderRadius: 1,
                                                  transition: 'border-color 0.2s',
                                                  '&:hover': {
                                                    borderColor: 'primary.main',
                                                  }
                                                }}
                                              >
                                                <Typography 
                                                  variant="body2" 
                                                  sx={{ 
                                                    wordBreak: 'break-word',
                                                    color: value ? 'text.primary' : 'text.disabled',
                                                    fontSize: '0.8rem'
                                                  }}
                                                >
                                                  {value !== null && value !== undefined 
                                                    ? (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))
                                                    : 'N/A'}
                                                </Typography>
                                              </Box>
                                            </Box>
                                          </Grid>
                                        ))}
                                      </Grid>
                                    </>
                                  )}

                                  {/* BNG Section */}
                                  {troubleshoot.bng && (
                                    <>
                                      <Typography variant="subtitle2" gutterBottom component="div" color="primary" sx={{ mt: 1, mb: 1 }}>
                                        BNG
                                      </Typography>
                                      <Grid container spacing={1} sx={{ mb: 2 }}>
                                        {Object.entries(troubleshoot.bng).map(([key, value]) => (
                                          <Grid item xs={12} sm={6} md={3} key={key}>
                                            <Box>
                                              <Typography 
                                                variant="caption" 
                                                color="primary.main"
                                                sx={{ 
                                                  fontWeight: 600, 
                                                  textTransform: 'uppercase',
                                                  letterSpacing: 0.5,
                                                  display: 'block',
                                                  mb: 0.3,
                                                  fontSize: '0.7rem'
                                                }}
                                              >
                                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                              </Typography>
                                              <Box 
                                                sx={{ 
                                                  p: 0.5,
                                                  border: 1,
                                                  borderColor: 'divider',
                                                  borderRadius: 1,
                                                  transition: 'border-color 0.2s',
                                                  '&:hover': {
                                                    borderColor: 'primary.main',
                                                  }
                                                }}
                                              >
                                                <Typography 
                                                  variant="body2" 
                                                  sx={{ 
                                                    wordBreak: 'break-word',
                                                    color: value ? 'text.primary' : 'text.disabled',
                                                    fontSize: '0.8rem',
                                                    whiteSpace: 'pre-wrap'
                                                  }}
                                                >
                                                  {value !== null && value !== undefined 
                                                    ? (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))
                                                    : 'N/A'}
                                                </Typography>
                                              </Box>
                                            </Box>
                                          </Grid>
                                        ))}
                                      </Grid>
                                    </>
                                  )}

                                  {/* Status Section */}
                                  <Typography variant="subtitle2" gutterBottom component="div" color="primary" sx={{ mt: 1, mb: 1 }}>
                                    Status
                                  </Typography>
                                  <Grid container spacing={1} sx={{ mb: 1 }}>
                                    {['status', 'errors'].map((key) => {
                                      const value = troubleshoot[key];
                                      if (value === undefined) return null;
                                      return (
                                        <Grid item xs={12} sm={6} md={3} key={key}>
                                          <Box>
                                            <Typography 
                                              variant="caption" 
                                              color="primary.main"
                                              sx={{ 
                                                fontWeight: 600, 
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                                display: 'block',
                                                mb: 0.3,
                                                fontSize: '0.7rem'
                                              }}
                                            >
                                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </Typography>
                                            <Box 
                                              sx={{ 
                                                p: 0.5,
                                                border: 1,
                                                borderColor: 'divider',
                                                borderRadius: 1,
                                                transition: 'border-color 0.2s',
                                                '&:hover': {
                                                  borderColor: 'primary.main',
                                                }
                                              }}
                                            >
                                              <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                  wordBreak: 'break-word',
                                                  color: value ? 'text.primary' : 'text.disabled',
                                                  fontSize: '0.8rem'
                                                }}
                                              >
                                                {value !== null && value !== undefined ? String(value) : 'N/A'}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Grid>
                                      );
                                    })}
                                  </Grid>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 3 }}>
              No troubleshooting history found for this ONT.
            </Typography>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setTroubleshootDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmStartTroubleshoot} onClose={() => setConfirmStartTroubleshoot(false)}>
        <DialogTitle>Confirm Troubleshoot</DialogTitle>
        <DialogContent>
          <Typography>
            Do you want to start a new troubleshoot on the ONT <strong>{troubleshootingOnt?.serial_number}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmStartTroubleshoot(false)}>Cancel</Button>
          <Button onClick={handleStartTroubleshoot} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Onts;
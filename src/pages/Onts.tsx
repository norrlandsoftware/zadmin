import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import { onts, olts } from '../services/api.ts';

const columns = [
  { id: 'serial_number', label: 'Serial Number' },
  { id: 'sap_id', label: 'SAP ID' },
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
        <span
          style={{
            color: isAllGreen ? 'white' : 'inherit',
            backgroundColor: isAllGreen ? 'green' : 'transparent',
            padding: isAllGreen ? '2px 8px' : 0,
            borderRadius: isAllGreen ? '999px' : 0,
            display: 'inline-block',
          }}
        >
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
        <span
          style={{
            color: isAllGreen ? 'white' : 'inherit',
            backgroundColor: isAllGreen ? 'green' : 'transparent',
            padding: isAllGreen ? '2px 8px' : 0,
            borderRadius: isAllGreen ? '999px' : 0,
            display: 'inline-block',
          }}
        >
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
        <span
          style={{
            color: isAllGreen ? 'white' : 'inherit',
            backgroundColor: isAllGreen ? 'green' : 'transparent',
            padding: isAllGreen ? '2px 8px' : 0,
            borderRadius: isAllGreen ? '999px' : 0,
            display: 'inline-block',
          }}
        >
          {displayValue}
        </span>
      );
    }
  },
];

const formatOpticalMetric = (value: any): string => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  return String(value);
};

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
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [jsonDialogContent, setJsonDialogContent] = useState<any>(null);
  const [jsonDialogTitle, setJsonDialogTitle] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const navigate = useNavigate();

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

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonDialogContent, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (isLoading && !data) {
    return (
      <Layout title="Optical Network Terminals">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="Optical Network Terminals">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
        fieldActions={
          viewingOnt?.olt_name && viewingOnt?.olt_name !== 'N/A'
            ? {
                olt_name: {
                  icon: <OpenInNewIcon fontSize="small" />,
                  label: 'Open OLT details',
                  onClick: () => {
                    setDetailDialogOpen(false);
                    navigate('/olts', {
                      state: { openOltId: data?.data.find((ont: any) => ont.id === viewingOnt.id)?.olt_id },
                    });
                  },
                },
              }
            : undefined
        }
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
                                  <Grid container spacing={1} sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
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
                                    {/* Special handling for ingress_stats */}
                                    {troubleshoot.ingress_stats && typeof troubleshoot.ingress_stats === 'object' && (
                                      <>
                                        <Grid item xs={12} sm={6} md={3}>
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
                                              Offered Packets
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
                                                  color: 'text.primary',
                                                  fontSize: '0.8rem'
                                                }}
                                              >
                                                {troubleshoot.ingress_stats.offered_packets || 'N/A'}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
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
                                              Dropped Packets
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
                                                  color: 'text.primary',
                                                  fontSize: '0.8rem'
                                                }}
                                              >
                                                {troubleshoot.ingress_stats.dropped_packets || 'N/A'}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Grid>
                                      </>
                                    )}
                                  </Grid>

                                  {/* Optical Section */}
                                  <Typography variant="subtitle2" gutterBottom component="div" color="primary" sx={{ mt: 1, mb: 1 }}>
                                    Optical
                                  </Typography>
                                  <Box sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                                    <Grid container spacing={1}>
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

                                    {(troubleshoot.olt_rx_level !== undefined ||
                                      troubleshoot.ont_rx_level !== undefined ||
                                      troubleshoot.ont_tx_level !== undefined ||
                                      troubleshoot.actual_loss !== undefined ||
                                      troubleshoot.expected_loss !== undefined) && (
                                      <Box
                                        sx={{
                                          mt: 1.5,
                                          pt: 1.5,
                                          borderTop: 1,
                                          borderColor: 'divider',
                                          overflowX: 'auto',
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            position: 'relative',
                                            minWidth: 440,
                                            maxWidth: 520,
                                            height: 132,
                                            mx: 'auto',
                                          }}
                                        >
                                        <Box
                                          sx={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 22,
                                            width: 96,
                                            height: 88,
                                            border: 1.5,
                                            borderColor: 'primary.main',
                                            borderRadius: 3,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: 'background.paper',
                                          }}
                                        >
                                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'primary.main', position: 'absolute', top: 16, right: 10 }}>
                                            TX
                                          </Typography>
                                          <Typography sx={{ fontSize: '1.05rem', lineHeight: 1, fontWeight: 600 }}>
                                            OLT
                                          </Typography>
                                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'primary.main', position: 'absolute', bottom: 16, right: 10 }}>
                                            RX
                                          </Typography>
                                        </Box>

                                        <Box
                                          sx={{
                                            position: 'absolute',
                                            right: 0,
                                            top: 22,
                                            width: 96,
                                            height: 88,
                                            border: 1.5,
                                            borderColor: 'primary.main',
                                            borderRadius: 3,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: 'background.paper',
                                          }}
                                        >
                                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'primary.main', position: 'absolute', top: 16, left: 10 }}>
                                            RX
                                          </Typography>
                                          <Typography sx={{ fontSize: '1.05rem', lineHeight: 1, fontWeight: 600 }}>
                                            ONT
                                          </Typography>
                                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'primary.main', position: 'absolute', bottom: 16, left: 10 }}>
                                            TX
                                          </Typography>
                                        </Box>

                                        <Box
                                          sx={{
                                            position: 'absolute',
                                            left: 94,
                                            right: 94,
                                            top: 48,
                                            height: 2,
                                            bgcolor: 'primary.main',
                                          }}
                                        />
                                        <Box
                                          sx={{
                                            position: 'absolute',
                                            left: 94,
                                            right: 94,
                                            top: 82,
                                            height: 2,
                                            bgcolor: 'primary.main',
                                          }}
                                        />

                                        <Typography
                                          sx={{
                                            position: 'absolute',
                                            top: 16,
                                            right: 112,
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'error.main',
                                          }}
                                        >
                                          {formatOpticalMetric(troubleshoot.ont_rx_level)}
                                        </Typography>
                                        <Typography
                                          sx={{
                                            position: 'absolute',
                                            top: 64,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'error.main',
                                          }}
                                        >
                                          {formatOpticalMetric(troubleshoot.actual_loss ?? troubleshoot.expected_loss)}
                                        </Typography>
                                        <Typography
                                          sx={{
                                            position: 'absolute',
                                            top: 88,
                                            left: 102,
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'error.main',
                                          }}
                                        >
                                          {formatOpticalMetric(troubleshoot.olt_rx_level)}
                                        </Typography>
                                        <Typography
                                          sx={{
                                            position: 'absolute',
                                            top: 88,
                                            right: 112,
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'error.main',
                                          }}
                                        >
                                          {formatOpticalMetric(troubleshoot.ont_tx_level)}
                                        </Typography>
                                        </Box>
                                      </Box>
                                    )}
                                  </Box>

                                  {/* Radius Section */}
                                  {troubleshoot.radius && (
                                    <>
                                      <Typography variant="subtitle2" gutterBottom component="div" color="primary" sx={{ mt: 1, mb: 1 }}>
                                        Radius
                                      </Typography>
                                      <Grid container spacing={1} sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                                        {Object.entries(troubleshoot.radius).map(([key, value]) => {
                                          // Special handling for radpostauth array
                                          if (key === 'radpostauth' && Array.isArray(value) && value.length > 0) {
                                            return (
                                              <Grid item xs={12} key={key}>
                                                <Box>
                                                  <Typography 
                                                    variant="caption" 
                                                    color="primary.main"
                                                    sx={{ 
                                                      fontWeight: 600, 
                                                      textTransform: 'uppercase',
                                                      letterSpacing: 0.5,
                                                      display: 'block',
                                                      mb: 0.5,
                                                      fontSize: '0.7rem'
                                                    }}
                                                  >
                                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                  </Typography>
                                                  <TableContainer component={Paper} sx={{ border: 1, borderColor: 'divider' }}>
                                                    <Table size="small">
                                                      <TableHead>
                                                        <TableRow sx={{ backgroundColor: 'primary.light' }}>
                                                          <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                                                          <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
                                                          <TableCell sx={{ fontWeight: 600 }}>Reply</TableCell>
                                                          <TableCell sx={{ fontWeight: 600 }}>Auth Date</TableCell>
                                                          <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                                                        </TableRow>
                                                      </TableHead>
                                                      <TableBody>
                                                        {value.map((row: any, index: number) => (
                                                          <TableRow key={row.id || index}>
                                                            <TableCell>{row.id || 'N/A'}</TableCell>
                                                            <TableCell>{row.username || 'N/A'}</TableCell>
                                                            <TableCell>{row.reply || 'N/A'}</TableCell>
                                                            <TableCell>{row.authdate || 'N/A'}</TableCell>
                                                            <TableCell>{row.class || 'N/A'}</TableCell>
                                                          </TableRow>
                                                        ))}
                                                      </TableBody>
                                                    </Table>
                                                  </TableContainer>
                                                </Box>
                                              </Grid>
                                            );
                                          }
                                          
                                          // Default rendering for other fields
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
                                                    },
                                                    position: 'relative'
                                                  }}
                                                >
                                                  {typeof value === 'object' && value !== null ? (
                                                    <>
                                                      <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                          wordBreak: 'break-word',
                                                          color: 'text.primary',
                                                          fontSize: '0.8rem',
                                                          whiteSpace: 'pre-wrap',
                                                          maxHeight: '60px',
                                                          overflow: 'hidden',
                                                          textOverflow: 'ellipsis'
                                                        }}
                                                      >
                                                        {JSON.stringify(value, null, 2).substring(0, 100)}...
                                                      </Typography>
                                                      <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                          setJsonDialogTitle(key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
                                                          setJsonDialogContent(value);
                                                          setJsonDialogOpen(true);
                                                        }}
                                                        sx={{
                                                          position: 'absolute',
                                                          bottom: 2,
                                                          right: 2,
                                                          backgroundColor: 'background.paper',
                                                          color: 'primary.main',
                                                          '&:hover': {
                                                            backgroundColor: 'action.hover',
                                                          }
                                                        }}
                                                      >
                                                        <ExpandMoreIcon fontSize="small" />
                                                      </IconButton>
                                                    </>
                                                  ) : (
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
                                                  )}
                                                </Box>
                                              </Box>
                                            </Grid>
                                          );
                                        })}
                                      </Grid>
                                    </>
                                  )}

                                  {/* BNG Section */}
                                  {troubleshoot.bng && (
                                    <>
                                      <Typography variant="subtitle2" gutterBottom component="div" color="primary" sx={{ mt: 1, mb: 1 }}>
                                        BNG
                                      </Typography>
                                      <Grid container spacing={1} sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                                        {Object.entries(troubleshoot.bng).map(([key, value]) => {
                                          // Special handling for ingress_stats
                                          if (key === 'ingress_stats' && typeof value === 'object' && value !== null) {
                                            return (
                                              <Grid item xs={12} key={key}>
                                                <Box sx={{ mb: 1 }}>
                                                  <Typography 
                                                    variant="caption" 
                                                    color="primary.main"
                                                    sx={{ 
                                                      fontWeight: 600, 
                                                      textTransform: 'uppercase',
                                                      letterSpacing: 0.5,
                                                      display: 'block',
                                                      mb: 0.5,
                                                      fontSize: '0.7rem'
                                                    }}
                                                  >
                                                    Ingress Stats
                                                  </Typography>
                                                  <Grid container spacing={1} sx={{ p: 1, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                                                    <Grid item xs={12} sm={6} md={3}>
                                                      <Box>
                                                        <Typography 
                                                          variant="caption" 
                                                          sx={{ 
                                                            fontWeight: 500,
                                                            display: 'block',
                                                            mb: 0.3,
                                                            fontSize: '0.65rem',
                                                            color: 'text.secondary'
                                                          }}
                                                        >
                                                          Offered Packets
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
                                                              color: 'text.primary',
                                                              fontSize: '0.8rem'
                                                            }}
                                                          >
                                                            {(value as any).offered_packets || 'N/A'}
                                                          </Typography>
                                                        </Box>
                                                      </Box>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6} md={3}>
                                                      <Box>
                                                        <Typography 
                                                          variant="caption" 
                                                          sx={{ 
                                                            fontWeight: 500,
                                                            display: 'block',
                                                            mb: 0.3,
                                                            fontSize: '0.65rem',
                                                            color: 'text.secondary'
                                                          }}
                                                        >
                                                          Dropped Packets
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
                                                              color: 'text.primary',
                                                              fontSize: '0.8rem'
                                                            }}
                                                          >
                                                            {(value as any).dropped_packets || 'N/A'}
                                                          </Typography>
                                                        </Box>
                                                      </Box>
                                                    </Grid>
                                                  </Grid>
                                                </Box>
                                              </Grid>
                                            );
                                          }
                                          
                                          // Special handling for egress_stats
                                          if (key === 'egress_stats' && typeof value === 'object' && value !== null) {
                                            return (
                                              <Grid item xs={12} key={key}>
                                                <Box sx={{ mb: 1 }}>
                                                  <Typography 
                                                    variant="caption" 
                                                    color="primary.main"
                                                    sx={{ 
                                                      fontWeight: 600, 
                                                      textTransform: 'uppercase',
                                                      letterSpacing: 0.5,
                                                      display: 'block',
                                                      mb: 0.5,
                                                      fontSize: '0.7rem'
                                                    }}
                                                  >
                                                    Egress Stats
                                                  </Typography>
                                                  <Grid container spacing={1} sx={{ p: 1, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                                                    <Grid item xs={12} sm={6} md={3}>
                                                      <Box>
                                                        <Typography 
                                                          variant="caption" 
                                                          sx={{ 
                                                            fontWeight: 500,
                                                            display: 'block',
                                                            mb: 0.3,
                                                            fontSize: '0.65rem',
                                                            color: 'text.secondary'
                                                          }}
                                                        >
                                                          Forwarded Packets
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
                                                              color: 'text.primary',
                                                              fontSize: '0.8rem'
                                                            }}
                                                          >
                                                            {(value as any).forwarded_packets || 'N/A'}
                                                          </Typography>
                                                        </Box>
                                                      </Box>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6} md={3}>
                                                      <Box>
                                                        <Typography 
                                                          variant="caption" 
                                                          sx={{ 
                                                            fontWeight: 500,
                                                            display: 'block',
                                                            mb: 0.3,
                                                            fontSize: '0.65rem',
                                                            color: 'text.secondary'
                                                          }}
                                                        >
                                                          Dropped Packets
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
                                                              color: 'text.primary',
                                                              fontSize: '0.8rem'
                                                            }}
                                                          >
                                                            {(value as any).dropped_packets || 'N/A'}
                                                          </Typography>
                                                        </Box>
                                                      </Box>
                                                    </Grid>
                                                  </Grid>
                                                </Box>
                                              </Grid>
                                            );
                                          }
                                          
                                          // Default rendering for other fields
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
                                                    },
                                                    position: 'relative'
                                                  }}
                                                >
                                                  {typeof value === 'object' && value !== null ? (
                                                    <>
                                                      <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                          wordBreak: 'break-word',
                                                          color: 'text.primary',
                                                          fontSize: '0.8rem',
                                                          whiteSpace: 'pre-wrap',
                                                          maxHeight: '60px',
                                                          overflow: 'hidden',
                                                          textOverflow: 'ellipsis'
                                                        }}
                                                      >
                                                        {JSON.stringify(value, null, 2).substring(0, 100)}...
                                                      </Typography>
                                                      <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                          setJsonDialogTitle(key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
                                                          setJsonDialogContent(value);
                                                          setJsonDialogOpen(true);
                                                        }}
                                                        sx={{
                                                          position: 'absolute',
                                                          bottom: 2,
                                                          right: 2,
                                                          backgroundColor: 'background.paper',
                                                          color: 'primary.main',
                                                          '&:hover': {
                                                            backgroundColor: 'action.hover',
                                                          }
                                                        }}
                                                      >
                                                        <ExpandMoreIcon fontSize="small" />
                                                      </IconButton>
                                                    </>
                                                  ) : (
                                                    <Typography 
                                                      variant="body2" 
                                                      sx={{ 
                                                        wordBreak: 'break-word',
                                                        color: value ? 'text.primary' : 'text.disabled',
                                                        fontSize: '0.8rem',
                                                        whiteSpace: 'pre-wrap'
                                                      }}
                                                    >
                                                      {value !== null && value !== undefined ? String(value) : 'N/A'}
                                                    </Typography>
                                                  )}
                                                </Box>
                                              </Box>
                                            </Grid>
                                          );
                                        })}
                                      </Grid>
                                    </>
                                  )}

                                  {/* Status Section */}
                                  <Typography variant="subtitle2" gutterBottom component="div" color="primary" sx={{ mt: 1, mb: 1 }}>
                                    Status
                                  </Typography>
                                  <Grid container spacing={1} sx={{ mb: 1, p: 1.5, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
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

      <Dialog open={jsonDialogOpen} onClose={() => setJsonDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{jsonDialogTitle}</Typography>
            <IconButton
              onClick={handleCopyJson}
              size="small"
              sx={{
                color: copySuccess ? 'success.main' : 'primary.main',
                '&:hover': {
                  backgroundColor: 'action.hover',
                }
              }}
              title={copySuccess ? 'Copied!' : 'Copy to clipboard'}
            >
              <ContentCopyIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box 
            sx={{ 
              backgroundColor: 'grey.100', 
              p: 2, 
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: '60vh'
            }}
          >
            <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(jsonDialogContent, null, 2)}
            </pre>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Onts;

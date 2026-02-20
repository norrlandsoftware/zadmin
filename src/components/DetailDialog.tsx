import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material';

interface DetailDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  data: any;
}

const DetailDialog: React.FC<DetailDialogProps> = ({
  open,
  onClose,
  title,
  data,
}) => {
  if (!data) return null;

  const formatLabel = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderField = (key: string, value: any) => (
    <Grid item xs={12} sm={6} key={key}>
      <Box>
        <Typography 
          variant="caption" 
          color="primary.main"
          sx={{ 
            fontWeight: 600, 
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            display: 'block',
            mb: 0.5
          }}
        >
          {formatLabel(key)}
        </Typography>
        <Box 
          sx={{ 
            p: 1,
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
            variant="body1" 
            sx={{ 
              wordBreak: 'break-word',
              color: value ? 'text.primary' : 'text.disabled'
            }}
          >
            {formatValue(value)}
          </Typography>
        </Box>
      </Box>
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={3}>
              {Object.entries(data).map(([key, value]) => renderField(key, value))}
            </Grid>
          </CardContent>
        </Card>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetailDialog;
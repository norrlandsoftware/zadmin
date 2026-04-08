import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);

  // Initialize map when map dialog opens
  React.useEffect(() => {
    if (mapDialogOpen && mapContainerRef.current && !mapRef.current && data) {
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      
      mapRef.current = L.map(mapContainerRef.current).setView([lat, lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      L.marker([lat, lng])
        .addTo(mapRef.current)
        .bindPopup(
          `<strong>${data.name || 'Location'}</strong><br/>
          ${data.address || ''}<br/>
          ${data.city || ''}, ${data.country || ''}`
        )
        .openPopup();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapDialogOpen, data]);

  if (!data) return null;

  const metadataKeys = ['id', 'created_at', 'updated_at'];

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

  const formatDateValue = (value: any): string => {
    if (!value) return 'N/A';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // Check if latitude and longitude are valid
  const hasValidCoordinates = () => {
    const lat = data.latitude;
    const lng = data.longitude;
    return lat != null && lng != null && lat !== '' && lng !== '' && 
           !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
  };

  // Reorder fields to put latitude and longitude last
  const reorderFields = (entries: [string, any][]) => {
    const latLngFields = entries.filter(([key]) => key === 'latitude' || key === 'longitude');
    const otherFields = entries.filter(([key]) => key !== 'latitude' && key !== 'longitude');
    return [...otherFields, ...latLngFields];
  };

  const contentEntries = reorderFields(
    Object.entries(data).filter(([key]) => !metadataKeys.includes(key))
  );

  const metadataEntries = Object.entries(data).filter(([key]) =>
    metadataKeys.includes(key)
  );

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
          {((key === 'is_active') || (key === 'enabled')) && typeof value === 'boolean' ? (
            <Checkbox
              checked={value}
              disabled
              size="small"
              sx={{ p: 0, color: 'text.disabled' }}
            />
          ) : (
            <Typography 
              variant="body1" 
              sx={{ 
                wordBreak: 'break-word',
                color: value ? 'text.primary' : 'text.disabled'
              }}
            >
              {key === 'last_login' ? formatDateValue(value) : formatValue(value)}
            </Typography>
          )}
        </Box>
      </Box>
    </Grid>
  );

  const renderObjectField = (key: string, value: Record<string, any>) => (
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
          }}
        >
          {formatLabel(key)}
        </Typography>
        <Box
          sx={{
            p: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Grid container spacing={1.5}>
            {Object.entries(value).length > 0 ? (
              Object.entries(value).map(([objectKey, objectValue]) => (
                <Grid item xs={12} sm={6} key={objectKey}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}
                  >
                    {formatLabel(objectKey)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ wordBreak: 'break-word', color: 'text.primary' }}
                  >
                    {formatValue(objectValue)}
                  </Typography>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.disabled">
                  N/A
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      </Box>
    </Grid>
  );

  return (
    <>
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
                {contentEntries.map(([key, value]) =>
                  key === 'config' && value && typeof value === 'object' && !Array.isArray(value)
                    ? renderObjectField(key, value as Record<string, any>)
                    : renderField(key, value)
                )}
              </Grid>
              {hasValidCoordinates() && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<MapIcon />}
                    onClick={() => setMapDialogOpen(true)}
                  >
                    Show Map
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
          {metadataEntries.length > 0 && (
            <Box sx={{ mt: 2, px: 1 }}>
              <Grid container spacing={1.5}>
                {metadataEntries.map(([key, value]) => (
                  <Grid item xs={12} sm={4} key={key}>
                    <Typography
                      variant="caption"
                      color="primary.main"
                      sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}
                    >
                      {formatLabel(key)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ wordBreak: 'break-word', color: 'text.primary' }}
                    >
                      {key === 'created_at' || key === 'updated_at'
                        ? formatDateValue(value)
                        : formatValue(value)}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={mapDialogOpen} onClose={() => setMapDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {data.name || 'Location'} - Map View
        </DialogTitle>
        <DialogContent>
          <Box
            ref={mapContainerRef}
            sx={{
              height: '500px',
              width: '100%',
              borderRadius: 1,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMapDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DetailDialog;

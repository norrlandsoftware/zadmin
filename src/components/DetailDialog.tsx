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
  IconButton,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PopMap from './PopMap.tsx';

interface DetailDialogFieldAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface DetailDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  data: any;
  fieldActions?: Record<string, DetailDialogFieldAction>;
  fullWidthFields?: string[];
  htmlPreviewFields?: string[];
}

const DetailDialog: React.FC<DetailDialogProps> = ({
  open,
  onClose,
  title,
  data,
  fieldActions,
  fullWidthFields = [],
  htmlPreviewFields = [],
}) => {
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visibleConfigSecrets, setVisibleConfigSecrets] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!open) {
      setShowUsername(false);
      setShowPassword(false);
      setVisibleConfigSecrets({});
    }
  }, [open, data]);

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
    Object.entries(data).filter(([key]) =>
      !metadataKeys.includes(key) && key !== 'username' && key !== 'password'
    )
  );

  const credentialsEntries = Object.entries(data).filter(([key]) =>
    key === 'username' || key === 'password'
  );

  const metadataEntries = Object.entries(data).filter(([key]) =>
    metadataKeys.includes(key)
  );

  const mapPop = hasValidCoordinates()
    ? [{
        id: String(data.id ?? data.name ?? 'location'),
        name: data.name || 'Location',
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        address: data.address,
        city: data.city,
        country: data.country,
      }]
    : [];

  const renderField = (key: string, value: any) => (
    <Grid item xs={12} sm={fullWidthFields.includes(key) ? 12 : 6} key={key}>
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
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    wordBreak: 'break-word',
                    color: value ? 'text.primary' : 'text.disabled',
                    flex: 1,
                  }}
                >
                  {key === 'last_login' ? formatDateValue(value) : formatValue(value)}
                </Typography>
                {fieldActions?.[key] && (
                  <IconButton
                    size="small"
                    aria-label={fieldActions[key].label}
                    onClick={fieldActions[key].onClick}
                  >
                    {fieldActions[key].icon}
                  </IconButton>
                )}
              </Box>
              {htmlPreviewFields.includes(key) && typeof value === 'string' && value.trim() && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}
                  >
                    Body View
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.default',
                      overflow: 'auto',
                    }}
                    dangerouslySetInnerHTML={{ __html: value }}
                  />
                </Box>
              )}
            </Box>
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
              Object.entries(value).map(([objectKey, objectValue]) => {
                const normalizedKey = objectKey.replace(/[\s_]/g, '').toLowerCase();
                const isSensitiveConfigField =
                  key === 'config' &&
                  (normalizedKey === 'password' || normalizedKey === 'apikey');
                const visibilityKey = `${key}.${objectKey}`;
                const isVisible = !!visibleConfigSecrets[visibilityKey];

                return (
                  <Grid item xs={12} sm={6} key={objectKey}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}
                    >
                      {formatLabel(objectKey)}
                    </Typography>
                    {isSensitiveConfigField ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ wordBreak: 'break-word', color: 'text.primary', flex: 1 }}
                        >
                          {isVisible
                            ? formatValue(objectValue)
                            : objectValue !== null && objectValue !== undefined && objectValue !== ''
                              ? '••••••••'
                              : 'N/A'}
                        </Typography>
                        {(objectValue !== null && objectValue !== undefined && objectValue !== '') && (
                          <IconButton
                            size="small"
                            aria-label={isVisible ? `Hide ${formatLabel(objectKey)}` : `Show ${formatLabel(objectKey)}`}
                            onClick={() =>
                              setVisibleConfigSecrets((prev) => ({
                                ...prev,
                                [visibilityKey]: !prev[visibilityKey],
                              }))
                            }
                          >
                            {isVisible ? (
                              <VisibilityOff fontSize="small" />
                            ) : (
                              <Visibility fontSize="small" />
                            )}
                          </IconButton>
                        )}
                      </Box>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{ wordBreak: 'break-word', color: 'text.primary' }}
                      >
                        {formatValue(objectValue)}
                      </Typography>
                    )}
                  </Grid>
                );
              })
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

  const renderSensitiveField = (
    key: 'username' | 'password',
    value: any,
    visible: boolean,
    onToggle: () => void
  ) => (
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
            mb: 0.5,
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            transition: 'border-color 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
            },
          }}
        >
          <Typography
            variant="body1"
            sx={{
              wordBreak: 'break-word',
              color: value ? 'text.primary' : 'text.disabled',
              flex: 1,
            }}
          >
            {visible ? formatValue(value) : value ? '••••••••' : 'N/A'}
          </Typography>
          {!!value && (
            <IconButton
              size="small"
              aria-label={visible ? `Hide ${key}` : `Show ${key}`}
              onClick={onToggle}
            >
              {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          )}
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
                {credentialsEntries.length > 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Credentials
                      </Typography>
                      <Grid container spacing={3}>
                        {credentialsEntries.map(([key, value]) =>
                          key === 'username'
                            ? renderSensitiveField('username', value, showUsername, () =>
                                setShowUsername((prev) => !prev)
                              )
                            : renderSensitiveField('password', value, showPassword, () =>
                                setShowPassword((prev) => !prev)
                              )
                        )}
                      </Grid>
                    </Box>
                  </Grid>
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
          <PopMap pops={mapPop} />
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

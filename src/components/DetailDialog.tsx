import React, { useState } from 'react';
import MaterialSymbol from './MaterialSymbol.tsx';
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
  IconButton,
  Chip,
} from '@mui/material';
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
  actions?: React.ReactNode;
  extraContent?: React.ReactNode;
  fieldActions?: Record<string, DetailDialogFieldAction>;
  fullWidthFields?: string[];
  htmlPreviewFields?: string[];
  preformattedFields?: string[];
}

const FIELD_LABEL_SX = {
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  display: 'block',
  mb: 0.3,
  fontSize: '0.7rem',
} as const;

const FIELD_BOX_SX = {
  p: 0.5,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  minHeight: 34,
  transition: 'border-color 0.2s',
  '&:hover': {
    borderColor: 'primary.main',
  },
} as const;

const DetailDialog: React.FC<DetailDialogProps> = ({
  open,
  onClose,
  title,
  data,
  actions,
  extraContent,
  fieldActions,
  fullWidthFields = [],
  htmlPreviewFields = [],
  preformattedFields = [],
}) => {
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visibleConfigSecrets, setVisibleConfigSecrets] = useState<Record<string, boolean>>({});
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [jsonDialogTitle, setJsonDialogTitle] = useState('');
  const [jsonDialogContent, setJsonDialogContent] = useState<any>(null);

  React.useEffect(() => {
    if (!open) {
      setShowUsername(false);
      setShowPassword(false);
      setVisibleConfigSecrets({});
      setJsonDialogOpen(false);
      setJsonDialogTitle('');
      setJsonDialogContent(null);
    }
  }, [open, data]);

  if (!data) return null;

  const metadataKeys = ['id', 'created_at', 'updated_at'];

  const formatLabel = (key: string): string => {
    if (key === 'compatible_olt_models_section') return 'Compatible OLT Models';
    if (key === 'supported_olt_model_codes') return 'Supported OLT Model Codes';
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
    <Grid item xs={12} sm={6} md={fullWidthFields.includes(key) ? 12 : 3} key={key}>
      <Box>
        <Box
          sx={{
            position: 'relative',
            mb: 0.5,
            minHeight: 18,
            pr: fieldActions?.[key] ? 3 : 0,
          }}
        >
          <Typography
            variant="caption"
            color="primary.main"
            sx={FIELD_LABEL_SX}
          >
            {formatLabel(key)}
          </Typography>
          {fieldActions?.[key] && (
            <IconButton
              size="small"
              aria-label={fieldActions[key].label}
              onClick={fieldActions[key].onClick}
              sx={{
                position: 'absolute',
                top: -2,
                right: 0,
                p: 0.25,
              }}
            >
              {fieldActions[key].icon}
            </IconButton>
          )}
        </Box>
        <Box sx={FIELD_BOX_SX}>
          {((key === 'is_active') || (key === 'enabled')) && typeof value === 'boolean' ? (
            <Chip
              size="small"
              label={value ? 'Yes' : 'No'}
              color={value ? 'success' : 'default'}
              variant={value ? 'filled' : 'outlined'}
              sx={{ height: 22, fontSize: '0.75rem' }}
            />
          ) : key === 'last_login' ? (
            <Typography
              variant="body2"
              component="div"
              sx={{
                wordBreak: 'break-word',
                color: value ? 'text.primary' : 'text.disabled',
                flex: 1,
                fontSize: '0.82rem',
                lineHeight: 1.35,
              }}
            >
              {formatDateValue(value)}
            </Typography>
          ) : (
            <Box>
              {preformattedFields.includes(key) && typeof value === 'string' ? (
                <Box sx={{ position: 'relative' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-word',
                      color: 'text.primary',
                      fontSize: '0.82rem',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.35,
                      maxHeight: '7.8em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      pr: 4,
                    }}
                  >
                    {value}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="Expand text"
                    onClick={() => {
                      setJsonDialogTitle(formatLabel(key));
                      setJsonDialogContent(value);
                      setJsonDialogOpen(true);
                    }}
                    sx={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      backgroundColor: 'background.paper',
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <MaterialSymbol name="expand_more" fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Typography
                  variant="body2"
                  component="div"
                  sx={{
                    wordBreak: 'break-word',
                    color: value ? 'text.primary' : 'text.disabled',
                    flex: 1,
                    fontSize: '0.82rem',
                    lineHeight: 1.35,
                  }}
                >
                  {formatValue(value)}
                </Typography>
              )}
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
                      p: 1.5,
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
        <Box
          sx={{
            position: 'relative',
            mb: 0.5,
            minHeight: 18,
            pr: fieldActions?.[key] ? 3 : 0,
          }}
        >
          <Typography
            variant="caption"
            color="primary.main"
            sx={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              display: 'block',
            }}
          >
            {formatLabel(key)}
          </Typography>
          {fieldActions?.[key] && (
            <IconButton
              size="small"
              aria-label={fieldActions[key].label}
              onClick={fieldActions[key].onClick}
              sx={{
                position: 'absolute',
                top: -2,
                right: 0,
                p: 0.25,
              }}
            >
              {fieldActions[key].icon}
            </IconButton>
          )}
        </Box>
        <Box
          sx={{
            p: 0.75,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          {key === 'context' ? (
            <Box>
              <Box sx={{ position: 'relative' }}>
                <Typography
                  variant="body2"
                  sx={{
                    wordBreak: 'break-word',
                    color: 'text.primary',
                    fontSize: '0.8rem',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '60px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    pr: 4,
                  }}
                >
                  {JSON.stringify(value, null, 2).substring(0, 140)}...
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    setJsonDialogTitle(formatLabel(key));
                    setJsonDialogContent(value);
                    setJsonDialogOpen(true);
                  }}
                  sx={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    backgroundColor: 'background.paper',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <MaterialSymbol name="expand_more" fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ) : (
            <Grid container spacing={1}>
              {Object.entries(value).length > 0 ? (
                Object.entries(value).map(([objectKey, objectValue]) => {
                  const normalizedKey = objectKey.replace(/[\s_]/g, '').toLowerCase();
                  const isSensitiveConfigField =
                    key === 'config' &&
                    (normalizedKey === 'password' || normalizedKey === 'apikey');
                  const visibilityKey = `${key}.${objectKey}`;
                  const isVisible = !!visibleConfigSecrets[visibilityKey];

                  return (
                    <Grid item xs={12} sm={6} md={3} key={objectKey}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 0.25, fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
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
                            sx={{ wordBreak: 'break-word', color: 'text.primary', flex: 1, fontSize: '0.82rem', lineHeight: 1.35 }}
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
                                <MaterialSymbol name="visibility_off" fontSize="small" />
                              ) : (
                                <MaterialSymbol name="visibility" fontSize="small" />
                              )}
                            </IconButton>
                          )}
                        </Box>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ wordBreak: 'break-word', color: 'text.primary', fontSize: '0.82rem', lineHeight: 1.35 }}
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
          )}
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
    <Grid item xs={12} sm={6} md={3} key={key}>
      <Box>
        <Typography
          variant="caption"
          color="primary.main"
          sx={FIELD_LABEL_SX}
        >
          {formatLabel(key)}
        </Typography>
        <Box sx={{ ...FIELD_BOX_SX, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            variant="body2"
            sx={{
              wordBreak: 'break-word',
              color: value ? 'text.primary' : 'text.disabled',
              flex: 1,
              fontSize: '0.82rem',
              lineHeight: 1.35,
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
              {visible ? <MaterialSymbol name="visibility_off" fontSize="small" /> : <MaterialSymbol name="visibility" fontSize="small" />}
            </IconButton>
          )}
        </Box>
      </Box>
    </Grid>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Grid container spacing={1.5}>
                {contentEntries.map(([key, value]) =>
                  value && typeof value === 'object' && !Array.isArray(value)
                    ? renderObjectField(key, value as Record<string, any>)
                    : renderField(key, value)
                )}
                {credentialsEntries.length > 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Credentials
                      </Typography>
                      <Grid container spacing={1.5}>
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
                    startIcon={<MaterialSymbol name="map" />}
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
                  <Grid item xs={12} sm={6} md={3} key={key}>
                    <Typography
                      variant="caption"
                      color="primary.main"
                      sx={FIELD_LABEL_SX}
                    >
                      {formatLabel(key)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ wordBreak: 'break-word', color: 'text.primary', fontSize: '0.82rem', lineHeight: 1.35 }}
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
          {extraContent && <Box sx={{ mt: 3 }}>{extraContent}</Box>}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          {actions}
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

      <Dialog open={jsonDialogOpen} onClose={() => setJsonDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">{jsonDialogTitle}</Typography>
            <IconButton
              size="small"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(jsonDialogContent ?? {}, null, 2))}
            >
              <MaterialSymbol name="content_copy" fontSize="small" />
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
              maxHeight: '60vh',
            }}
          >
            <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {typeof jsonDialogContent === 'string'
                ? jsonDialogContent
                : JSON.stringify(jsonDialogContent, null, 2)}
            </pre>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DetailDialog;

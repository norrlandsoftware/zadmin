import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Slider,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Layout from '../components/Layout.tsx';
import {
  oltLineCardModels,
  oltModels,
  oltSettings,
  oltUplinkCardModels,
  olts,
  switches,
} from '../services/api.ts';

const splitRatioValues = [1, 2, 4, 8, 16, 32, 64, 128, 256];

const splitRatioMarks = splitRatioValues.map((_, index) => ({
  value: index,
}));

const compactFieldSx = {
  '& .MuiInputBase-root': {
    minHeight: 32,
    fontSize: '0.8125rem',
  },
  '& .MuiInputBase-input': {
    py: 0.5,
  },
  '& .MuiSelect-select': {
    py: 0.5,
  },
};

interface PonSlotConfig {
  slotNumber: number;
  lineCardModelId: string;
  splitRatio: number;
}

interface UplinkSlotConfig {
  slotNumber: number;
  uplinkCardModelId: string;
  switchId: string;
  switchPort: string;
  switchIpAddress: string;
  oltPort: string;
}

const OltSettings: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [ponSlots, setPonSlots] = useState<PonSlotConfig[]>([]);
  const [uplinkSlots, setUplinkSlots] = useState<UplinkSlotConfig[]>([]);
  const [applyAllPonSlots, setApplyAllPonSlots] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSettingsHydrated, setIsSettingsHydrated] = useState(false);

  const { data: olt, isLoading } = useQuery(
    ['olt-settings-olt', id],
    () => olts.getById(id),
    { enabled: Boolean(id) }
  );

  const { data: oltModel, isLoading: isModelLoading } = useQuery(
    ['olt-settings-model', olt?.model_id],
    () => oltModels.getById(olt.model_id),
    { enabled: Boolean(olt?.model_id) }
  );

  const { data: existingSettings, isLoading: isExistingSettingsLoading } = useQuery(
    ['olt-settings-existing', id],
    () => oltSettings.getByOltId(id),
    { enabled: Boolean(id), retry: false }
  );

  const { data: lineCardModelsData, isLoading: isLineCardModelsLoading } = useQuery(
    ['olt-line-card-models-settings'],
    () => oltLineCardModels.getAll({ size: 1000, sort: 'name' })
  );

  const { data: uplinkCardModelsData, isLoading: isUplinkCardModelsLoading } = useQuery(
    ['olt-uplink-card-models-settings'],
    () => oltUplinkCardModels.getAll({ size: 1000, sort: 'name' })
  );

  const { data: switchesData, isLoading: isSwitchesLoading } = useQuery(
    ['switches-settings'],
    () => switches.getAll({ size: 1000, sort: 'name' })
  );

  const lineCardModelById = useMemo(
    () =>
      new Map(
        (lineCardModelsData?.data || []).map((model: any) => [model.id, model])
      ),
    [lineCardModelsData]
  );

  const switchById = useMemo(
    () => new Map((switchesData?.data || []).map((item: any) => [item.id, item])),
    [switchesData]
  );

  const switchByName = useMemo(
    () => new Map((switchesData?.data || []).map((item: any) => [item.name, item])),
    [switchesData]
  );

  const isCompatibleWithCurrentOltModel = useCallback((cardModel: any) => {
    if (!olt?.model_id) {
      return true;
    }

    const compatibleOltModelIds = cardModel?.olt_model_ids;
    return (
      !Array.isArray(compatibleOltModelIds) ||
      compatibleOltModelIds.length === 0 ||
      compatibleOltModelIds.includes(olt.model_id)
    );
  }, [olt?.model_id]);

  const compatibleLineCardModels = useMemo(
    () => (lineCardModelsData?.data || []).filter(isCompatibleWithCurrentOltModel),
    [lineCardModelsData, isCompatibleWithCurrentOltModel]
  );

  const compatibleUplinkCardModels = useMemo(
    () => (uplinkCardModelsData?.data || []).filter(isCompatibleWithCurrentOltModel),
    [uplinkCardModelsData, isCompatibleWithCurrentOltModel]
  );

  useEffect(() => {
    const slotCount = Number(oltModel?.number_of_pon_slots || 0);

    setPonSlots((current) =>
      Array.from({ length: slotCount }, (_, index) => {
        const slotNumber = index + 1;
        return (
          current.find((slot) => slot.slotNumber === slotNumber) || {
            slotNumber,
            lineCardModelId: '',
            splitRatio: 1,
          }
        );
      })
    );

    if (slotCount <= 1) {
      setApplyAllPonSlots(false);
    }
  }, [oltModel?.number_of_pon_slots]);

  useEffect(() => {
    const slotCount = Number(oltModel?.number_of_uplink_slots || 0);

    setUplinkSlots((current) =>
      Array.from({ length: slotCount }, (_, index) => {
        const slotNumber = index + 1;
        return (
          current.find((slot) => slot.slotNumber === slotNumber) || {
            slotNumber,
            uplinkCardModelId: '',
            switchId: '',
            switchPort: '',
            switchIpAddress: '',
            oltPort: '',
          }
        );
      })
    );
  }, [oltModel?.number_of_uplink_slots]);

  const updatePonSlot = (
    slotNumber: number,
    changes: Partial<Omit<PonSlotConfig, 'slotNumber'>>
  ) => {
    setPonSlots((current) =>
      current.map((slot) => {
        if (applyAllPonSlots && slotNumber === 1) {
          return { ...slot, ...changes };
        }

        return slot.slotNumber === slotNumber ? { ...slot, ...changes } : slot;
      })
    );
  };

  const handleApplyAllPonSlotsChange = (checked: boolean) => {
    setApplyAllPonSlots(checked);

    if (!checked) {
      return;
    }

    setPonSlots((current) => {
      const firstSlot = current[0];
      if (!firstSlot) {
        return current;
      }

      return current.map((slot) => ({
        ...slot,
        lineCardModelId: firstSlot.lineCardModelId,
        splitRatio: firstSlot.splitRatio,
      }));
    });
  };

  const updateUplinkSlot = (
    slotNumber: number,
    changes: Partial<Omit<UplinkSlotConfig, 'slotNumber'>>
  ) => {
    setUplinkSlots((current) =>
      current.map((slot) =>
        slot.slotNumber === slotNumber ? { ...slot, ...changes } : slot
      )
    );
  };

  const buildSettingsPayload = () => ({
    elements: {
      pon: ponSlots
        .filter((slot) => slot.lineCardModelId)
        .map((slot) => ({
          slot: String(slot.slotNumber),
          olt_line_card_model_id: slot.lineCardModelId,
          configuration: {
            split_ratio: `1:${slot.splitRatio}`,
          },
        })),
      uplink: uplinkSlots
        .filter((slot) => slot.uplinkCardModelId)
        .map((slot) => {
          return {
            name: `uplink${slot.slotNumber}`,
            olt_uplink_card_model_id: slot.uplinkCardModelId,
            configuration: {
              uplink_device_type: 'switch',
              uplink_device_id: slot.switchId || '',
              ip_address: slot.switchIpAddress,
              olt_port: slot.oltPort,
              switch_port: slot.switchPort,
            },
          };
        }),
    },
  });

  const handleOpenSaveConfirm = () => {
    setSaveError(null);
    setSaveMessage(null);
    setConfirmSaveOpen(true);
  };

  useEffect(() => {
    if (isSettingsHydrated) {
      return;
    }

    if (ponSlots.length === 0 && uplinkSlots.length === 0) {
      return;
    }

    if (!existingSettings?.elements) {
      setIsSettingsHydrated(true);
      return;
    }

    const existingPonBySlot = new Map(
      ((existingSettings.elements.pon as any[]) || []).map((item: any) => [
        Number(item.slot),
        item,
      ])
    );
    const existingUplinkByName = new Map(
      ((existingSettings.elements.uplink as any[]) || []).map((item: any) => [item.name, item])
    );

    setPonSlots((current) =>
      current.map((slot) => {
        const existingSlot = existingPonBySlot.get(slot.slotNumber);
        if (!existingSlot) {
          return slot;
        }

        const splitRatioValue = String(existingSlot.configuration?.split_ratio || '');
        const splitRatioNumber = Number(splitRatioValue.split(':')[1]);
        const normalizedSplitRatio = splitRatioValues.includes(splitRatioNumber)
          ? splitRatioNumber
          : slot.splitRatio;

        return {
          ...slot,
          lineCardModelId: existingSlot.olt_line_card_model_id || '',
          splitRatio: normalizedSplitRatio,
        };
      })
    );

    setUplinkSlots((current) =>
      current.map((slot) => {
        const existingSlot = existingUplinkByName.get(`uplink${slot.slotNumber}`);
        if (!existingSlot) {
          return slot;
        }

        const configuredSwitchId = existingSlot.configuration?.uplink_device_id || '';
        const configuredSwitch =
          switchById.get(configuredSwitchId) ||
          switchByName.get(existingSlot.configuration?.uplink_device_name || '');

        return {
          ...slot,
          uplinkCardModelId: existingSlot.olt_uplink_card_model_id || '',
          switchId: configuredSwitchId || configuredSwitch?.id || '',
          switchPort: existingSlot.configuration?.switch_port || '',
          switchIpAddress: existingSlot.configuration?.ip_address || '',
          oltPort: existingSlot.configuration?.olt_port || '',
        };
      })
    );

    setIsSettingsHydrated(true);
  }, [
    existingSettings,
    isSettingsHydrated,
    ponSlots.length,
    switchById,
    switchByName,
    uplinkSlots.length,
  ]);

  const handleConfirmSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      await oltSettings.save(id, buildSettingsPayload());
      setConfirmSaveOpen(false);
      setSaveMessage('OLT settings saved.');
    } catch (error: any) {
      setSaveError(
        error?.response?.data?.detail?.[0]?.msg ||
          error?.response?.data?.message ||
          'Unable to save OLT settings.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (
    isLoading ||
    isModelLoading ||
    isExistingSettingsLoading ||
    isLineCardModelsLoading ||
    isUplinkCardModelsLoading ||
    isSwitchesLoading
  ) {
    return (
      <Layout title="OLT Settings">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="OLT Settings">
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/olts')}
        >
          Back
        </Button>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
            {olt?.name || 'OLT Settings'}
          </Typography>
          {olt?.ip_address_v4 && (
            <Typography variant="body2" color="text.secondary">
              {olt.ip_address_v4}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          onClick={handleOpenSaveConfirm}
          disabled={isSaving || !id}
        >
          Save
        </Button>
      </Box>

      {saveMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {saveMessage}
        </Alert>
      )}
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              PON
            </Typography>
            {ponSlots.length > 1 && (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={applyAllPonSlots}
                    onChange={(event) => handleApplyAllPonSlotsChange(event.target.checked)}
                  />
                }
                label="Apply to all the slots"
                sx={{
                  mr: 0,
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.8125rem',
                  },
                }}
              />
            )}
          </Box>
          {!olt?.model_id && (
            <Alert severity="info">
              This OLT does not have a model assigned.
            </Alert>
          )}
          {olt?.model_id && ponSlots.length === 0 && (
            <Alert severity="info">
              The selected OLT model has no PON slots.
            </Alert>
          )}
          {ponSlots.length > 0 && (
            <Box
              sx={{
                px: 1.25,
                mb: 0.5,
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns: '64px minmax(200px, 1.1fr) 72px 92px minmax(220px, 1.4fr) 56px',
                gap: 1.25,
                alignItems: 'center',
              }}
            >
              {['Slot', 'Line Card', 'PON', 'XGSPON', 'Split Ratio', ''].map((label, index) => (
                <Typography
                  key={`${label}-${index}`}
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  {label}
                </Typography>
              ))}
            </Box>
          )}
          {ponSlots.map((slot) => {
            const isDisabledByApplyAll = applyAllPonSlots && slot.slotNumber !== 1;
            const lineCardModel = lineCardModelById.get(slot.lineCardModelId);
            const ponPorts = lineCardModel?.number_of_pon_ports ?? 0;
            const xgsponPorts = lineCardModel?.number_of_xgspon_ports ?? 0;
            const sliderValue = Math.max(0, splitRatioValues.indexOf(slot.splitRatio));

            return (
              <Box
                key={slot.slotNumber}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 1.25,
                  py: 0.5,
                  mb: 0.75,
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '64px minmax(200px, 1.1fr) 72px 92px minmax(220px, 1.4fr) 56px',
                  },
                  gap: 1.25,
                  alignItems: 'center',
                  opacity: isDisabledByApplyAll ? 0.5 : 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {slot.slotNumber}
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  sx={compactFieldSx}
                  value={slot.lineCardModelId}
                  disabled={isDisabledByApplyAll}
                  onChange={(event) =>
                    updatePonSlot(slot.slotNumber, {
                      lineCardModelId: event.target.value,
                    })
                  }
                >
                  <MenuItem value="">N/A</MenuItem>
                  {compatibleLineCardModels.map((model: any) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography variant="body2" color="text.secondary">
                  {slot.lineCardModelId ? ponPorts : 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {slot.lineCardModelId ? xgsponPorts : 'N/A'}
                </Typography>
                <Box sx={{ px: 1, minWidth: 0 }}>
                  <Slider
                    size="small"
                    min={0}
                    max={splitRatioValues.length - 1}
                    step={1}
                    marks={splitRatioMarks}
                    value={sliderValue}
                    disabled={isDisabledByApplyAll}
                    valueLabelDisplay="off"
                    valueLabelFormat={(value) => `1:${splitRatioValues[value]}`}
                    onChange={(_, value) =>
                      updatePonSlot(slot.slotNumber, {
                        splitRatio: splitRatioValues[value as number],
                      })
                    }
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  1:{slot.splitRatio}
                </Typography>
              </Box>
            );
          })}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
            Uplink
          </Typography>
          {!olt?.model_id && (
            <Alert severity="info">
              This OLT does not have a model assigned.
            </Alert>
          )}
          {olt?.model_id && uplinkSlots.length === 0 && (
            <Alert severity="info">
              The selected OLT model has no uplink slots.
            </Alert>
          )}
          {uplinkSlots.length > 0 && (
            <Box
              sx={{
                px: 1.25,
                mb: 0.5,
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns:
                  '64px minmax(170px, 1fr) minmax(170px, 1fr) 110px 140px 100px',
                gap: 1.25,
                alignItems: 'center',
              }}
            >
              {['Slot', 'Uplink Card', 'Uplink Device', 'Switch Port', 'Switch IP', 'OLT Port'].map(
                (label) => (
                  <Typography
                    key={label}
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    {label}
                  </Typography>
                )
              )}
            </Box>
          )}
          {uplinkSlots.map((slot) => (
            <Box
              key={slot.slotNumber}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.25,
                py: 0.5,
                mb: 0.75,
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '64px minmax(170px, 1fr) minmax(170px, 1fr) 110px 140px 100px',
                },
                gap: 1.25,
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {slot.slotNumber}
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                sx={compactFieldSx}
                value={slot.uplinkCardModelId}
                onChange={(event) =>
                  updateUplinkSlot(slot.slotNumber, {
                    uplinkCardModelId: event.target.value,
                  })
                }
              >
                <MenuItem value="">N/A</MenuItem>
                {compatibleUplinkCardModels.map((model: any) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                sx={compactFieldSx}
                value={slot.switchId}
                onChange={(event) =>
                  updateUplinkSlot(slot.slotNumber, { switchId: event.target.value })
                }
              >
                <MenuItem value="">N/A</MenuItem>
                {switchesData?.data.map((item: any) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                size="small"
                sx={compactFieldSx}
                value={slot.switchPort}
                onChange={(event) =>
                  updateUplinkSlot(slot.slotNumber, { switchPort: event.target.value })
                }
              />
              <TextField
                fullWidth
                size="small"
                sx={compactFieldSx}
                value={slot.switchIpAddress}
                onChange={(event) =>
                  updateUplinkSlot(slot.slotNumber, {
                    switchIpAddress: event.target.value,
                  })
                }
              />
              <TextField
                fullWidth
                size="small"
                sx={compactFieldSx}
                value={slot.oltPort}
                onChange={(event) =>
                  updateUplinkSlot(slot.slotNumber, { oltPort: event.target.value })
                }
              />
            </Box>
          ))}
        </Paper>
      </Box>

      <Dialog
        open={confirmSaveOpen}
        onClose={() => !isSaving && setConfirmSaveOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Save OLT Settings</DialogTitle>
        <DialogContent>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            Confirm saving the current PON and uplink settings for this OLT.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSaveOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default OltSettings;

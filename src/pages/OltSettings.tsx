import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MaterialSymbol from '../components/MaterialSymbol.tsx';
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
import Layout from '../components/Layout.tsx';
import { useResultBar } from '../contexts/ResultBarContext.tsx';
import {
  bngModels,
  bngs,
  oltLineCardModels,
  oltModels,
  ontFiles,
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

const getApiErrorMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (typeof data === 'string') {
    return data;
  }
  if (data?.context?.message) {
    return data.context.message;
  }
  if (data?.detail?.context?.message) {
    return data.detail.context.message;
  }
  if (Array.isArray(data?.detail)) {
    return data.detail.map((item: any) => item?.msg || String(item)).join('\n');
  }
  return data?.detail || data?.message || fallback;
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
  ptpNetwork: string;
  lag: boolean;
  uplinkPorts: string[];
}

interface BngSlotConfig {
  slotNumber: number;
  bngId: string;
  isPrimary: boolean;
  priority: string;
}

interface SoftwareControlMatrixRow {
  rowId: string;
  hardwareVersion: string;
  ontType: string;
  softwareVersionFileId: string;
  configFileId: string;
}

const SOFTWARE_CONTROL_MATRIX_MIN_ROWS = 4;
const ONT_TYPE_OPTIONS = ['DO', 'RGW'];

const createSoftwareControlMatrixRow = (index: number): SoftwareControlMatrixRow => ({
  rowId: `software-control-${index + 1}`,
  hardwareVersion: '',
  ontType: '',
  softwareVersionFileId: '',
  configFileId: '',
});

const OltSettings: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [ponSlots, setPonSlots] = useState<PonSlotConfig[]>([]);
  const [uplinkSlots, setUplinkSlots] = useState<UplinkSlotConfig[]>([]);
  const [bngSlots, setBngSlots] = useState<BngSlotConfig[]>([]);
  const [softwareControlMatrixRows, setSoftwareControlMatrixRows] = useState<SoftwareControlMatrixRow[]>([]);
  const [applyAllPonSlots, setApplyAllPonSlots] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingConfig, setIsGeneratingConfig] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasSavedSettings, setHasSavedSettings] = useState(false);
  const { pushResult } = useResultBar();

  const {
    data: existingSettings,
    isLoading: isExistingSettingsLoading,
    isError: isExistingSettingsError,
  } = useQuery(
    ['olt-settings-existing', id],
    () => oltSettings.getByOltId(id),
    {
      enabled: Boolean(id),
      retry: false,
      refetchOnMount: 'always',
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
    }
  );

  const isSettingsResolved =
    Boolean(id) && (!isExistingSettingsLoading || isExistingSettingsError);

  const { data: olt } = useQuery(
    ['olt-settings-olt', id],
    () => olts.getById(id),
    { enabled: isSettingsResolved }
  );

  const { data: oltModel, isLoading: isOltModelLoading } = useQuery(
    ['olt-settings-model', olt?.model_code],
    () => oltModels.getByCode(olt.model_code),
    { enabled: Boolean(olt?.model_code) }
  );

  const canLoadReferencedResources =
    isSettingsResolved;

  const settingsElements = useMemo(
    () => (existingSettings && (existingSettings as any).elements ? (existingSettings as any).elements : null),
    [existingSettings]
  );

  const settingsLinecards = useMemo(
    () => ((settingsElements?.linecards as any[]) || (settingsElements?.pon as any[]) || []),
    [settingsElements]
  );

  const settingsUplinks = useMemo(
    () => ((settingsElements?.uplinks as any[]) || (settingsElements?.uplink as any[]) || []),
    [settingsElements]
  );

  const settingsBngIds = useMemo(
    () =>
      Array.from(
        new Set(
          (((settingsElements?.bng as any[]) || [])
            .map((item: any) => item?.bng_id)
            .filter(Boolean))
        )
      ),
    [settingsElements]
  );

  const settingsSoftwareControlMatrix = useMemo(
    () =>
      ((settingsElements?.ont_sw_ctrl_matrix as any[]) || (settingsElements?.software_control_matrix as any[]) || []),
    [settingsElements]
  );

  const { data: lineCardModelsData, isLoading: isLineCardModelsLoading } = useQuery(
    ['olt-line-card-models-settings'],
    () => oltLineCardModels.getAll({ size: 1000, sort: 'name' }),
    { enabled: canLoadReferencedResources }
  );

  const { data: uplinkCardModelsData, isLoading: isUplinkCardModelsLoading } = useQuery(
    ['olt-uplink-card-models-settings'],
    () => oltUplinkCardModels.getAll({ size: 1000, sort: 'name' }),
    { enabled: canLoadReferencedResources }
  );

  const { data: switchesData, isLoading: isSwitchesLoading } = useQuery(
    ['switches-settings'],
    () => switches.getAll({ size: 1000, sort: 'name', q: 'type:DISTRIBUTION' }),
    { enabled: canLoadReferencedResources }
  );
  const { data: bngsData, isLoading: isBngsLoading } = useQuery(
    ['bngs-settings'],
    () => bngs.getAll({ size: 1000, sort: 'name' }),
    { enabled: canLoadReferencedResources }
  );
  const { data: bngModelsData, isLoading: isBngModelsLoading } = useQuery(
    ['bng-models-settings'],
    () => bngModels.getAll({ size: 1000, sort: 'name' }),
    { enabled: canLoadReferencedResources }
  );
  const { data: ontFilesData, isLoading: isOntFilesLoading } = useQuery(
    ['ont-files-settings'],
    () => ontFiles.getAll({ size: 1000, sort: 'name' }),
    { enabled: canLoadReferencedResources }
  );

  const lineCardModelById = useMemo(
    () =>
      new Map(
        (lineCardModelsData?.data || []).map((model: any) => [model.id, model])
      ),
    [lineCardModelsData]
  );
  const lineCardModelByCode = useMemo(
    () =>
      new Map(
        (lineCardModelsData?.data || [])
          .filter((model: any) => model.code)
          .map((model: any) => [model.code, model])
      ),
    [lineCardModelsData]
  );
  const currentOltModelCode = oltModel?.code || '';
  const compatibleLineCardModels = useMemo(
    () =>
      (lineCardModelsData?.data || []).filter((model: any) => {
        const supportedCodes = Array.isArray(model?.olt_model_codes) ? model.olt_model_codes : [];
        if (supportedCodes.length === 0 && supportedIds.length === 0) {
          return true;
        }
        return currentOltModelCode !== '' && supportedCodes.includes(currentOltModelCode);
      }),
    [currentOltModelCode, lineCardModelsData]
  );

  const uplinkCardModelByCode = useMemo(
    () =>
      new Map(
        (uplinkCardModelsData?.data || [])
          .filter((model: any) => model.code)
          .map((model: any) => [model.code, model])
      ),
    [uplinkCardModelsData]
  );
  const uplinkCardModelById = useMemo(
    () =>
      new Map(
        (uplinkCardModelsData?.data || []).map((model: any) => [String(model.id), model])
      ),
    [uplinkCardModelsData]
  );
  const compatibleUplinkCardModels = useMemo(
    () =>
      (uplinkCardModelsData?.data || []).filter((model: any) => {
        const supportedCodes = Array.isArray(model?.olt_model_codes) ? model.olt_model_codes : [];
        if (supportedCodes.length === 0 && supportedIds.length === 0) {
          return true;
        }
        return currentOltModelCode !== '' && supportedCodes.includes(currentOltModelCode);
      }),
    [currentOltModelCode, uplinkCardModelsData]
  );

  const switchById = useMemo(
    () => new Map((switchesData?.data || []).map((item: any) => [item.id, item])),
    [switchesData]
  );

  const switchByName = useMemo(
    () => new Map((switchesData?.data || []).map((item: any) => [item.name, item])),
    [switchesData]
  );
  const bngModelById = useMemo(
    () => new Map((bngModelsData?.data || []).map((model: any) => [String(model.id), model])),
    [bngModelsData]
  );

  const availableBngOptions = useMemo(() => {
    const base = (bngsData?.data || []).map((item: any) => ({
      id: String(item.id),
      name: item.name || String(item.id),
    }));
    const knownIds = new Set(base.map((item: any) => item.id));
    const fallback = settingsBngIds
      .map((idValue) => String(idValue))
      .filter((idValue) => !knownIds.has(idValue))
      .map((idValue) => ({ id: idValue, name: idValue }));
    return [...base, ...fallback];
  }, [bngsData, settingsBngIds]);

  const softwareVersionFileOptions = useMemo(
    () =>
      (ontFilesData?.data || []).filter(
        (item: any) => String(item?.type || '').toUpperCase() === 'SW_VER'
      ),
    [ontFilesData]
  );

  const configFileOptions = useMemo(
    () =>
      (ontFilesData?.data || []).filter(
        (item: any) => String(item?.type || '').toUpperCase() === 'CONFIG'
      ),
    [ontFilesData]
  );
  const ontFileById = useMemo(
    () => new Map((ontFilesData?.data || []).map((item: any) => [String(item.id), item])),
    [ontFilesData]
  );
  const ontFileByName = useMemo(
    () => new Map((ontFilesData?.data || []).map((item: any) => [String(item.name), item])),
    [ontFilesData]
  );

  const settingsPonBySlot = useMemo(
    () =>
      new Map(
        (settingsLinecards.map((item: any) => [Number(item.slot), item]))
      ),
    [settingsLinecards]
  );

  const uplinkSlotNames = useMemo(() => {
    const configuredNames = Array.isArray(oltModel?.uplink_line_card_slots_name)
      ? oltModel.uplink_line_card_slots_name.map((name: any) => String(name).trim()).filter(Boolean)
      : [];
    if (configuredNames.length > 0) {
      return configuredNames;
    }
    const fallbackCount = Number(oltModel?.number_of_uplink_card_slots || 0);
    return Array.from({ length: fallbackCount }, (_, index) => `uplink${index + 1}`);
  }, [oltModel?.number_of_uplink_card_slots, oltModel?.uplink_line_card_slots_name]);

  const getUplinkSlotName = useCallback(
    (slotNumber: number) => uplinkSlotNames[slotNumber - 1] || `uplink${slotNumber}`,
    [uplinkSlotNames]
  );

  const getAvailableUplinkPortNames = useCallback(
    (uplinkCardModelId: string) => {
      const model = uplinkCardModelById.get(String(uplinkCardModelId));
      if (!model) {
        return [];
      }

      if (Array.isArray(model.uplink_port_names) && model.uplink_port_names.length > 0) {
        return model.uplink_port_names.map((name: any) => String(name)).filter(Boolean);
      }

      const portCount = Number(model.number_of_port || 0);
      return Array.from({ length: portCount }, (_, index) => `port${index + 1}`);
    },
    [uplinkCardModelById]
  );

  const settingsUplinkBySlot = useMemo(
    () =>
      new Map(
        uplinkSlotNames.map((slotName, index) => {
          const configuredItem = settingsUplinks.find((item: any) => String(item?.name || '') === slotName)
            || settingsUplinks[index];
          return [index + 1, configuredItem] as const;
        })
      ),
    [settingsUplinks, uplinkSlotNames]
  );

  useEffect(() => {
    const ponSlotCount = Number(oltModel?.number_of_line_card_slots || 0);
    const ponSlotNumbers = Array.from({ length: ponSlotCount }, (_, index) => index + 1);

    setPonSlots((current) =>
      ponSlotNumbers.map((slotNumber) => {
        const currentSlot = current.find((slot) => slot.slotNumber === slotNumber);
        if (currentSlot) {
          return currentSlot;
        }
        const item = settingsPonBySlot.get(slotNumber);
        const splitRatioValue = String(item?.configuration?.split_ratio || '');
        const splitRatioNumber = Number(splitRatioValue.split(':')[1]);
        const splitRatio = splitRatioValues.includes(splitRatioNumber) ? splitRatioNumber : 1;
        return {
          slotNumber,
          lineCardModelId: '',
          splitRatio,
        };
      })
    );

    if (ponSlotNumbers.length <= 1) {
      setApplyAllPonSlots(false);
    }
  }, [oltModel?.number_of_line_card_slots, settingsElements, settingsPonBySlot]);

  useEffect(() => {
    const uplinkSlotCount = Number(oltModel?.number_of_uplink_card_slots || 0);
    const uplinkSlotNumbers = Array.from({ length: uplinkSlotCount }, (_, index) => index + 1);

    setUplinkSlots((current) =>
      uplinkSlotNumbers.map((slotNumber) => {
        const currentSlot = current.find((slot) => slot.slotNumber === slotNumber);
        if (currentSlot) {
          return currentSlot;
        }
        const item = settingsUplinkBySlot.get(slotNumber);
        return {
          slotNumber,
          uplinkCardModelId: '',
          switchId: item?.configuration?.uplink_device_id || '',
          switchPort: item?.configuration?.switch_port || '',
          ptpNetwork: item?.configuration?.ptp_network || item?.configuration?.ip_address || '',
          lag: Boolean(item?.configuration?.lag),
          uplinkPorts: Array.isArray(item?.configuration?.uplink_port)
            ? item.configuration.uplink_port
                .map((value: any) => String(value))
                .filter(Boolean)
                .map((value: string) => value.split(':').slice(1).join(':') || value)
            : item?.configuration?.olt_port
              ? [String(item.configuration.olt_port)]
              : [],
        };
      })
    );
  }, [oltModel?.number_of_uplink_card_slots, settingsElements, settingsUplinkBySlot]);

  // Reconcile slot selections when referenced resources arrive after initial settings hydration.
  useEffect(() => {
    if (!settingsElements) {
      return;
    }

    setPonSlots((current) =>
      current.map((slot) => {
        if (slot.lineCardModelId) {
          return slot;
        }
        const source = settingsPonBySlot.get(slot.slotNumber);
        if (!source) {
          return slot;
        }
        const resolvedModelId =
          lineCardModelByCode.get(source.olt_line_card_model_code || '')?.id ||
          source.olt_line_card_model_id ||
          '';
        return resolvedModelId ? { ...slot, lineCardModelId: resolvedModelId } : slot;
      })
    );

    setUplinkSlots((current) =>
      current.map((slot) => {
        const source = settingsUplinkBySlot.get(slot.slotNumber);
        if (!source) {
          return slot;
        }

        const resolvedModelId =
          uplinkCardModelByCode.get(source.olt_uplink_card_model_code || '')?.id ||
          source.olt_uplink_card_model_id ||
          '';
        const configuredSwitchId = source.configuration?.uplink_device_id || '';
        const configuredSwitch =
          switchById.get(configuredSwitchId) ||
          switchByName.get(source.configuration?.uplink_device_name || '');

        return {
          ...slot,
          uplinkCardModelId: slot.uplinkCardModelId || resolvedModelId || '',
          switchId: slot.switchId || configuredSwitchId || configuredSwitch?.id || '',
          switchPort: slot.switchPort || source.configuration?.switch_port || '',
          ptpNetwork:
            slot.ptpNetwork ||
            source.configuration?.ptp_network ||
            source.configuration?.ip_address ||
            '',
          lag: slot.lag || Boolean(source.configuration?.lag),
          uplinkPorts:
            slot.uplinkPorts.length > 0
              ? slot.uplinkPorts
              : Array.isArray(source.configuration?.uplink_port)
                ? source.configuration.uplink_port
                    .map((value: any) => String(value))
                    .filter(Boolean)
                    .map((value: string) => value.split(':').slice(1).join(':') || value)
                : source.configuration?.olt_port
                  ? [String(source.configuration.olt_port)]
                  : [],
        };
      })
    );
  }, [
    lineCardModelByCode,
    settingsElements,
    settingsPonBySlot,
    settingsUplinkBySlot,
    switchById,
    switchByName,
    uplinkCardModelByCode,
  ]);

  useEffect(() => {
    setBngSlots((current) =>
      Array.from({ length: 2 }, (_, index) => {
        const slotNumber = index + 1;
        const source = ((settingsElements?.bng as any[]) || [])[index];
        const existing = current.find((slot) => slot.slotNumber === slotNumber);
        if (!existing) {
          return {
            slotNumber,
            bngId: source?.bng_id || '',
            isPrimary:
              source?.configuration?.primary != null
                ? Boolean(source.configuration.primary)
                : slotNumber === 1,
            priority:
              source?.configuration?.priority != null
                ? String(source.configuration.priority)
                : slotNumber === 1
                  ? '75'
                  : '125',
          };
        }

        // If slot exists but is still empty, backfill from settings when they arrive.
        return {
          ...existing,
          bngId: existing.bngId || (source?.bng_id != null ? String(source.bng_id) : ''),
          isPrimary:
            source?.configuration?.primary != null
              ? Boolean(source.configuration.primary)
              : existing.isPrimary,
          priority:
            source?.configuration?.priority != null
              ? String(source.configuration.priority)
              : existing.priority,
        };
      })
    );
  }, [settingsElements]);

  useEffect(() => {
    setSoftwareControlMatrixRows((current) => {
      const configuredRows = settingsSoftwareControlMatrix.map((item: any, index: number) => ({
        rowId: item?.id || item?.row_id || `software-control-saved-${index + 1}`,
        hardwareVersion: item?.hw_version || item?.hardware_version || '',
        ontType: item?.ont_type || '',
        softwareVersionFileId:
          ontFileByName.get(item?.sw_version || '')?.id ||
          item?.software_version_file_id ||
          item?.software_version_ont_file_id ||
          item?.software_version_file?.id ||
          '',
        configFileId:
          ontFileByName.get(item?.cfg_file || '')?.id ||
          item?.config_file_id ||
          item?.config_ont_file_id ||
          item?.config_file?.id ||
          '',
      }));

      const targetLength = Math.max(
        SOFTWARE_CONTROL_MATRIX_MIN_ROWS,
        configuredRows.length,
        current.length
      );

      return Array.from({ length: targetLength }, (_, index) => {
        const existing = current[index];
        const configured = configuredRows[index];

        if (existing) {
          return {
            ...existing,
            hardwareVersion: existing.hardwareVersion || configured?.hardwareVersion || '',
            ontType: existing.ontType || configured?.ontType || '',
            softwareVersionFileId:
              existing.softwareVersionFileId || configured?.softwareVersionFileId || '',
            configFileId: existing.configFileId || configured?.configFileId || '',
          };
        }

        if (configured) {
          return configured;
        }

        return createSoftwareControlMatrixRow(index);
      });
    });
  }, [ontFileByName, settingsSoftwareControlMatrix]);

  const updatePonSlot = (
    slotNumber: number,
    changes: Partial<Omit<PonSlotConfig, 'slotNumber'>>
  ) => {
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
    setUplinkSlots((current) =>
      current.map((slot) =>
        slot.slotNumber === slotNumber ? { ...slot, ...changes } : slot
      )
    );
  };

  const updateBngSlot = (
    slotNumber: number,
    changes: Partial<Omit<BngSlotConfig, 'slotNumber'>>
  ) => {
    setHasUnsavedChanges(true);
    setBngSlots((current) =>
      current.map((slot) => {
        if (slot.slotNumber !== slotNumber) {
          return slot;
        }
        return { ...slot, ...changes };
      })
    );
  };

  const handlePrimaryBngChange = (slotNumber: number) => {
    setHasUnsavedChanges(true);
    setBngSlots((current) =>
      current.map((slot) => ({
        ...slot,
        isPrimary: slot.slotNumber === slotNumber,
      }))
    );
  };

  const updateSoftwareControlMatrixRow = (
    rowId: string,
    changes: Partial<Omit<SoftwareControlMatrixRow, 'rowId'>>
  ) => {
    setHasUnsavedChanges(true);
    setSoftwareControlMatrixRows((current) =>
      current.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row))
    );
  };

  const handleAddSoftwareControlMatrixRow = () => {
    setHasUnsavedChanges(true);
    setSoftwareControlMatrixRows((current) => [
      ...current,
      createSoftwareControlMatrixRow(current.length),
    ]);
  };

  const handleRemoveSoftwareControlMatrixRow = (rowId: string) => {
    setHasUnsavedChanges(true);
    setSoftwareControlMatrixRows((current) => {
      if (current.length <= SOFTWARE_CONTROL_MATRIX_MIN_ROWS) {
        return current;
      }
      return current.filter((row) => row.rowId !== rowId);
    });
  };

  const currentSettingsElements = useMemo(
    () => ({
      linecards: ponSlots
        .filter((slot) => slot.lineCardModelId)
        .map((slot) => {
          const selectedLineCardModel = lineCardModelById.get(slot.lineCardModelId);
          return {
            slot: String(slot.slotNumber),
            olt_line_card_model_code: selectedLineCardModel?.code || '',
            pon_ports: selectedLineCardModel?.number_of_pon_ports ?? null,
            configuration: {
              split_ratio: `1:${slot.splitRatio}`,
            },
          };
        }),
      uplinks: uplinkSlots
        .filter((slot) => slot.uplinkCardModelId)
        .map((slot) => {
          const selectedSwitch = switchById.get(slot.switchId);
          const slotName = getUplinkSlotName(slot.slotNumber);
          return {
            name: slotName,
            slot_name: slotName,
            olt_uplink_card_model_code:
              (uplinkCardModelsData?.data || []).find(
                (model: any) => model.id === slot.uplinkCardModelId
              )?.code || '',
            configuration: {
              uplink_device_type: 'switch',
              uplink_device_id: slot.switchId || '',
              uplink_interface_name: selectedSwitch?.name || '',
              ptp_network: slot.ptpNetwork,
              lag: slot.lag,
              uplink_port: slot.uplinkPorts.map((portName) => `${slotName}:${portName}`),
              switch_port: slot.switchPort,
            },
          };
        }),
      bng: bngSlots
        .filter((slot) => slot.bngId)
        .map((slot) => {
          const selectedBng = (bngsData?.data || []).find(
            (item: any) => String(item.id) === String(slot.bngId)
          );

          return {
            bng_id: slot.bngId,
            ip_address: selectedBng?.ip_address_v4 || selectedBng?.ip_address || '',
            model_code:
              bngModelById.get(String(selectedBng?.model_id || ''))?.code ||
              selectedBng?.model_code ||
              '',
            configuration: {
              primary: slot.isPrimary,
              priority: slot.priority ? Number(slot.priority) : null,
            },
          };
        }),
      ont_sw_ctrl_matrix: softwareControlMatrixRows
        .filter(
          (row) =>
            row.hardwareVersion ||
            row.ontType ||
            row.softwareVersionFileId ||
            row.configFileId
        )
        .map((row, index) => ({
          sw_ctrl: index + 1,
          hw_version: row.hardwareVersion || null,
          ont_type: row.ontType || null,
          sw_version: ontFileById.get(String(row.softwareVersionFileId || ''))?.name || null,
          cfg_file: row.configFileId
            ? ontFileById.get(String(row.configFileId || ''))?.name || null
            : null,
        })),
    }),
    [
      bngModelById,
      bngSlots,
      bngsData,
      getUplinkSlotName,
      lineCardModelById,
      ontFileById,
      ponSlots,
      softwareControlMatrixRows,
      switchById,
      uplinkCardModelsData,
      uplinkSlots,
    ]
  );

  const buildSettingsPayload = () => ({
    elements: currentSettingsElements,
  });

  useEffect(() => {
    if (!settingsElements || !oltModel) {
      return;
    }

    const expectedPonSlots = Number(oltModel.number_of_line_card_slots || 0);
    const expectedUplinkSlots = Number(oltModel.number_of_uplink_card_slots || 0);
    if (
      ponSlots.length !== expectedPonSlots ||
      uplinkSlots.length !== expectedUplinkSlots ||
      bngSlots.length !== 2 ||
      softwareControlMatrixRows.length < SOFTWARE_CONTROL_MATRIX_MIN_ROWS
    ) {
      return;
    }

    const hasAnyExisting =
      settingsLinecards.length > 0 ||
      settingsUplinks.length > 0 ||
      (((settingsElements.bng as any[]) || []).length > 0) ||
      settingsSoftwareControlMatrix.length > 0;

    setHasSavedSettings(hasAnyExisting);
    setHasUnsavedChanges(false);
  }, [
    bngSlots.length,
    oltModel,
    ponSlots.length,
    settingsElements,
    settingsLinecards.length,
    settingsSoftwareControlMatrix.length,
    settingsUplinks.length,
    softwareControlMatrixRows.length,
    uplinkSlots.length,
  ]);

  const handleOpenSaveConfirm = () => {
    setConfirmSaveOpen(true);
  };

  const handleGenerateConfiguration = async () => {
    if (!id) {
      return;
    }

    setIsGeneratingConfig(true);

    try {
      await olts.renderConfig(id);
      pushResult('success', 'Configuration generated.');
    } catch (error: any) {
      pushResult(
        'error',
        getApiErrorMessage(error, 'Unable to generate configuration.')
      );
    } finally {
      setIsGeneratingConfig(false);
    }
  };

  useEffect(() => {
    if (!oltModel) {
      return;
    }

    const expectedPonSlots = Number(oltModel?.number_of_line_card_slots || 0);
    const expectedUplinkSlots = Number(oltModel?.number_of_uplink_card_slots || 0);
    const isPonReady = ponSlots.length === expectedPonSlots;
    const isUplinkReady = uplinkSlots.length === expectedUplinkSlots;
    const isBngReady = bngSlots.length === 2;
    const isSoftwareControlMatrixReady =
      softwareControlMatrixRows.length >= SOFTWARE_CONTROL_MATRIX_MIN_ROWS;

    if (!isPonReady || !isUplinkReady || !isBngReady || !isSoftwareControlMatrixReady) {
      return;
    }

    if (!settingsElements) {
      return;
    }

    const existingPonBySlot = new Map(
      (settingsLinecards || []).map((item: any) => [
        Number(item.slot),
        item,
      ])
    );
    const existingUplinkByName = new Map(
      (settingsUplinks || []).map((item: any) => [item.name, item])
    );
    const existingBngByName = new Map(
      ((settingsElements.bng as any[]) || []).map((item: any) => [item.name, item])
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
          lineCardModelId:
            lineCardModelByCode.get(existingSlot.olt_line_card_model_code || '')?.id ||
            existingSlot.olt_line_card_model_id ||
            '',
          splitRatio: normalizedSplitRatio,
        };
      })
    );

    setUplinkSlots((current) =>
      current.map((slot) => {
        const existingSlot = existingUplinkByName.get(getUplinkSlotName(slot.slotNumber));
        if (!existingSlot) {
          return slot;
        }

        const configuredSwitchId = existingSlot.configuration?.uplink_device_id || '';
        const configuredSwitch =
          switchById.get(configuredSwitchId) ||
          switchByName.get(existingSlot.configuration?.uplink_device_name || '');

        return {
          ...slot,
          uplinkCardModelId:
            uplinkCardModelByCode.get(existingSlot.olt_uplink_card_model_code || '')?.id ||
            existingSlot.olt_uplink_card_model_id ||
            '',
          switchId: configuredSwitchId || configuredSwitch?.id || '',
          switchPort: existingSlot.configuration?.switch_port || '',
          ptpNetwork: existingSlot.configuration?.ptp_network || existingSlot.configuration?.ip_address || '',
          lag: Boolean(existingSlot.configuration?.lag),
          uplinkPorts: Array.isArray(existingSlot.configuration?.uplink_port)
            ? existingSlot.configuration.uplink_port
                .map((value: any) => String(value))
                .filter(Boolean)
                .map((value: string) => value.split(':').slice(1).join(':') || value)
            : existingSlot.configuration?.olt_port
              ? [String(existingSlot.configuration.olt_port)]
              : [],
        };
      })
    );

    setBngSlots((current) =>
      current.map((slot, index) => {
        const existingSlot =
          ((settingsElements.bng as any[]) || [])[index] ||
          existingBngByName.get(`bng${slot.slotNumber}`);
        if (!existingSlot) {
          return slot;
        }

        return {
          ...slot,
          bngId: existingSlot.bng_id || '',
          isPrimary: Boolean(existingSlot.configuration?.primary),
          priority: existingSlot.configuration?.priority != null
            ? String(existingSlot.configuration.priority)
            : slot.priority,
        };
      })
    );

  }, [
    bngSlots.length,
    bngsData,
    lineCardModelByCode,
    lineCardModelsData,
    getUplinkSlotName,
    oltModel?.number_of_line_card_slots,
    oltModel?.number_of_uplink_card_slots,
    uplinkSlotNames,
    settingsElements,
    settingsLinecards,
    settingsSoftwareControlMatrix,
    settingsUplinks,
    ponSlots.length,
    softwareControlMatrixRows.length,
    switchById,
    switchByName,
    switchesData,
    uplinkCardModelByCode,
    uplinkCardModelsData,
    uplinkSlots.length,
    oltModel,
  ]);

  const handleConfirmSave = async () => {
    setIsSaving(true);

    try {
      const payload = buildSettingsPayload();
      await oltSettings.save(id, payload);
      setConfirmSaveOpen(false);
      pushResult('success', 'OLT settings saved.');
      setHasSavedSettings(
        payload.elements.linecards.length > 0 ||
          payload.elements.uplinks.length > 0 ||
          payload.elements.bng.length > 0 ||
          payload.elements.ont_sw_ctrl_matrix.length > 0
      );
      setHasUnsavedChanges(false);
    } catch (error: any) {
      pushResult(
        'error',
        getApiErrorMessage(error, 'Unable to save OLT settings.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (
    isExistingSettingsLoading ||
    !olt ||
    isOltModelLoading ||
    isLineCardModelsLoading ||
    isUplinkCardModelsLoading ||
    isSwitchesLoading ||
    isBngsLoading ||
    isBngModelsLoading ||
    isOntFilesLoading
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
          startIcon={<MaterialSymbol name="arrow_back" />}
          onClick={() => navigate('/olts')}
        >
          Back
        </Button>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
            {olt?.name || `OLT Settings #${id}`}
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
        <Button
          variant="outlined"
          onClick={handleGenerateConfiguration}
          disabled={!hasSavedSettings || hasUnsavedChanges || isSaving || isGeneratingConfig || !id}
        >
          {isGeneratingConfig ? 'Generating...' : 'Generate Configuration'}
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gap: 2 }}>
        <Paper sx={{ px: 2, pt: 1, pb: 2 }}>
          <Box sx={{ mb: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              PON Line Cards
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
          {ponSlots.length === 0 && (
            <Alert severity="info">
              No PON slots found in current OLT settings.
            </Alert>
          )}
          {ponSlots.length > 0 && (
            <Box
              sx={{
                px: 1.25,
                mb: 0.5,
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns: '64px minmax(200px, 1.1fr) 72px minmax(220px, 1.4fr) 56px',
                gap: 1.25,
                alignItems: 'center',
              }}
            >
              {['Slot', 'Line Card', 'PON', 'Split Ratio', ''].map((label, index) => (
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
            const sliderValue = Math.max(0, splitRatioValues.indexOf(slot.splitRatio));

            return (
              <Box
                key={slot.slotNumber}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  px: 1.25,
                  py: 0.5,
                  mb: 0.75,
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '64px minmax(200px, 1.1fr) 72px minmax(220px, 1.4fr) 56px',
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

        <Paper sx={{ px: 2, pt: 1, pb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 0.75, fontWeight: 700 }}>
            Uplink Cards
          </Typography>
          {uplinkSlots.length === 0 && (
            <Alert severity="info">
              No uplink slots are defined for the selected OLT model.
            </Alert>
          )}
          {uplinkSlots.length > 0 && (
            <Box
              sx={{
                px: 1.25,
                mb: 0.5,
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns:
                  '64px minmax(170px, 1fr) minmax(170px, 1fr) 110px 140px 88px minmax(220px, 1.3fr)',
                gap: 1.25,
                alignItems: 'center',
              }}
            >
              {['Name', 'Uplink Card', 'Uplink Device', 'Switch Port', 'ptp network', 'LAG', 'Uplink Ports'].map(
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
                bgcolor: 'grey.100',
                borderRadius: 1,
                px: 1.25,
                py: 0.5,
                mb: 0.75,
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '64px minmax(170px, 1fr) minmax(170px, 1fr) 110px 140px 88px minmax(220px, 1.3fr)',
                },
                gap: 1.25,
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {getUplinkSlotName(slot.slotNumber)}
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
                    uplinkPorts: [],
                    lag: false,
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
                onChange={(event) => {
                  const selectedSwitchId = event.target.value;
                  updateUplinkSlot(slot.slotNumber, {
                    switchId: selectedSwitchId,
                  });
                }}
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
                value={slot.ptpNetwork}
                onChange={(event) =>
                  updateUplinkSlot(slot.slotNumber, { ptpNetwork: event.target.value })
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={slot.lag}
                    onChange={(event) =>
                      updateUplinkSlot(slot.slotNumber, {
                        lag: event.target.checked,
                        uplinkPorts: event.target.checked
                          ? slot.uplinkPorts
                          : slot.uplinkPorts.slice(0, 1),
                      })
                    }
                  />
                }
                label=""
                sx={{ m: 0, justifyContent: 'center' }}
              />
              <Box
                sx={{
                  minHeight: 42,
                  px: 0.75,
                  py: 0.5,
                  border: 1,
                  borderColor: 'text.primary',
                  borderRadius: 1,
                  bgcolor: '#bdbdbd',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.75,
                  alignItems: 'center',
                }}
              >
                {getAvailableUplinkPortNames(slot.uplinkCardModelId).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    N/A
                  </Typography>
                ) : (
                  getAvailableUplinkPortNames(slot.uplinkCardModelId).map((portName) => {
                    const isSelected = slot.uplinkPorts.includes(portName);
                    return (
                      <Button
                        key={portName}
                        size="small"
                        variant="contained"
                        disableElevation
                        onClick={() => {
                          if (slot.lag) {
                            const nextPorts = isSelected
                              ? slot.uplinkPorts.filter((value) => value !== portName)
                              : [...slot.uplinkPorts, portName];
                            updateUplinkSlot(slot.slotNumber, { uplinkPorts: nextPorts });
                            return;
                          }

                          updateUplinkSlot(slot.slotNumber, {
                            uplinkPorts: isSelected ? [] : [portName],
                          });
                        }}
                        sx={{
                          minWidth: 0,
                          px: 1.25,
                          py: 0.35,
                          borderRadius: 1,
                          lineHeight: 1,
                          fontSize: '0.8rem',
                          textTransform: 'none',
                          border: 1,
                          borderColor: 'text.primary',
                          bgcolor: isSelected ? 'primary.main' : 'background.paper',
                          color: isSelected ? 'common.white' : 'text.primary',
                          '&:hover': {
                            bgcolor: isSelected ? 'primary.dark' : 'grey.50',
                          },
                        }}
                      >
                        {portName}
                      </Button>
                    );
                  })
                )}
              </Box>
            </Box>
          ))}
        </Paper>

        <Paper sx={{ px: 2, pt: 1, pb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 0.75, fontWeight: 700 }}>
            BNG
          </Typography>
          <Box
            sx={{
              px: 1.25,
              mb: 0.5,
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns: '64px minmax(220px, 1fr) 110px 120px',
              gap: 1.25,
              alignItems: 'center',
            }}
          >
            {['', 'BNG', 'Primary', 'Priority'].map((label, index) => (
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
          {bngSlots.map((slot) => (
            <Box
              key={slot.slotNumber}
              sx={{
                border: 1,
                borderColor: 'divider',
                bgcolor: 'grey.100',
                borderRadius: 1,
                px: 1.25,
                py: 0.5,
                mb: 0.75,
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '64px minmax(220px, 1fr) 110px 120px',
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
                value={slot.bngId}
                onChange={(event) =>
                  updateBngSlot(slot.slotNumber, { bngId: event.target.value })
                }
              >
                <MenuItem value="">N/A</MenuItem>
                {availableBngOptions.map((item: any) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={slot.isPrimary}
                    onChange={() => handlePrimaryBngChange(slot.slotNumber)}
                  />
                }
                label=""
                sx={{ m: 0, justifyContent: 'center' }}
              />
              <TextField
                fullWidth
                size="small"
                sx={compactFieldSx}
                type="number"
                value={slot.priority}
                inputProps={{ min: 1, step: 1 }}
                onChange={(event) =>
                  updateBngSlot(slot.slotNumber, { priority: event.target.value })
                }
              />
            </Box>
          ))}
        </Paper>

        <Paper sx={{ px: 2, pt: 1, pb: 2 }}>
          <Box
            sx={{
              mb: 0.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              ONT Software Control Matrix
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<MaterialSymbol name="add" />}
              onClick={handleAddSoftwareControlMatrixRow}
            >
              Add Row
            </Button>
          </Box>
          <Box
            sx={{
              px: 1.25,
              mb: 0.5,
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns:
                '64px minmax(170px, 1fr) 120px minmax(220px, 1fr) minmax(220px, 1fr) 56px',
              gap: 1.25,
              alignItems: 'center',
            }}
          >
            {['Line', 'Hardware Version', 'Ont Type', 'Software Version File', 'Config File', ''].map(
              (label, index) => (
                <Typography
                  key={`${label}-${index}`}
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  {label}
                </Typography>
              )
            )}
          </Box>
          {softwareControlMatrixRows.map((row, index) => (
            <Box
              key={row.rowId}
              sx={{
                border: 1,
                borderColor: 'divider',
                bgcolor: 'grey.100',
                borderRadius: 1,
                px: 1.25,
                py: 0.5,
                mb: 0.75,
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '64px minmax(170px, 1fr) 120px minmax(220px, 1fr) minmax(220px, 1fr) 56px',
                },
                gap: 1.25,
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {index + 1}
              </Typography>
              <TextField
                fullWidth
                size="small"
                sx={compactFieldSx}
                value={row.hardwareVersion}
                onChange={(event) =>
                  updateSoftwareControlMatrixRow(row.rowId, {
                    hardwareVersion: event.target.value,
                  })
                }
              />
              <TextField
                select
                fullWidth
                size="small"
                sx={compactFieldSx}
                value={row.ontType}
                onChange={(event) =>
                  updateSoftwareControlMatrixRow(row.rowId, {
                    ontType: event.target.value,
                  })
                }
              >
                <MenuItem value="">N/A</MenuItem>
                {ONT_TYPE_OPTIONS.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                sx={compactFieldSx}
                value={row.softwareVersionFileId}
                onChange={(event) =>
                  updateSoftwareControlMatrixRow(row.rowId, {
                    softwareVersionFileId: event.target.value,
                  })
                }
              >
                <MenuItem value="">N/A</MenuItem>
                {softwareVersionFileOptions.map((file: any) => (
                  <MenuItem key={file.id} value={file.id}>
                    {file.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                sx={compactFieldSx}
                value={row.configFileId}
                onChange={(event) =>
                  updateSoftwareControlMatrixRow(row.rowId, {
                    configFileId: event.target.value,
                  })
                }
              >
                <MenuItem value="">N/A</MenuItem>
                {configFileOptions.map((file: any) => (
                  <MenuItem key={file.id} value={file.id}>
                    {file.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                color="error"
                size="small"
                variant="text"
                disabled={softwareControlMatrixRows.length <= SOFTWARE_CONTROL_MATRIX_MIN_ROWS}
                onClick={() => handleRemoveSoftwareControlMatrixRow(row.rowId)}
                sx={{ minWidth: 0, p: 0.5 }}
              >
                <MaterialSymbol name="delete" />
              </Button>
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
          <Typography variant="body2" color="text.secondary">
            Confirm saving the current PON, uplink, BNG, and software control matrix settings for this OLT.
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

import React, { useEffect, useMemo, useState } from 'react';
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

interface BngSlotConfig {
  slotNumber: number;
  bngId: string;
  isPrimary: boolean;
  priority: string;
}

const OltSettings: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [ponSlots, setPonSlots] = useState<PonSlotConfig[]>([]);
  const [uplinkSlots, setUplinkSlots] = useState<UplinkSlotConfig[]>([]);
  const [bngSlots, setBngSlots] = useState<BngSlotConfig[]>([]);
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
    { enabled: Boolean(id), retry: false }
  );

  const isSettingsResolved =
    Boolean(id) && (!isExistingSettingsLoading || isExistingSettingsError);

  const { data: olt } = useQuery(
    ['olt-settings-olt', id],
    () => olts.getById(id),
    { enabled: isSettingsResolved }
  );

  const { data: oltModel, isLoading: isOltModelLoading } = useQuery(
    ['olt-settings-model', olt?.model_id],
    () => oltModels.getById(olt.model_id),
    { enabled: Boolean(olt?.model_id) }
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

  const referencedLineCardModelCodes = useMemo(
    () =>
      Array.from(
        new Set(
          ((existingSettings?.elements?.linecards as any[]) || []).concat((existingSettings?.elements?.pon as any[]) || [])
            .map((item: any) => item.olt_line_card_model_code)
            .filter(Boolean)
        )
      ),
    [existingSettings]
  );

  const referencedLegacyLineCardModelIds = useMemo(
    () =>
      Array.from(
        new Set(
          ((existingSettings?.elements?.linecards as any[]) || []).concat((existingSettings?.elements?.pon as any[]) || [])
            .map((item: any) => item.olt_line_card_model_id)
            .filter(Boolean)
        )
      ),
    [existingSettings]
  );

  const referencedUplinkCardModelCodes = useMemo(
    () =>
      Array.from(
        new Set(
          ((existingSettings?.elements?.uplinks as any[]) || []).concat((existingSettings?.elements?.uplink as any[]) || [])
            .map((item: any) => item.olt_uplink_card_model_code)
            .filter(Boolean)
        )
      ),
    [existingSettings]
  );

  const referencedLegacyUplinkCardModelIds = useMemo(
    () =>
      Array.from(
        new Set(
          ((existingSettings?.elements?.uplinks as any[]) || []).concat((existingSettings?.elements?.uplink as any[]) || [])
            .map((item: any) => item.olt_uplink_card_model_id)
            .filter(Boolean)
        )
      ),
    [existingSettings]
  );

  const referencedSwitchIds = useMemo(
    () =>
      Array.from(
        new Set(
          ((existingSettings?.elements?.uplinks as any[]) || []).concat((existingSettings?.elements?.uplink as any[]) || [])
            .map((item: any) => item?.configuration?.uplink_device_id)
            .filter(Boolean)
        )
      ),
    [existingSettings]
  );

  const referencedBngIds = useMemo(
    () =>
      Array.from(
        new Set(
          ((existingSettings?.elements?.bng as any[]) || [])
            .map((item: any) => item.bng_id)
            .filter(Boolean)
        )
      ),
    [existingSettings]
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

  const { data: lineCardModelsData, isLoading: isLineCardModelsLoading } = useQuery(
    [
      'olt-line-card-models-settings',
      referencedLineCardModelCodes.join(','),
      referencedLegacyLineCardModelIds.join(','),
    ],
    async () => {
      if (referencedLineCardModelCodes.length === 0 && referencedLegacyLineCardModelIds.length === 0) {
        return oltLineCardModels.getAll({ size: 1000, sort: 'name' });
      }

      const byCodeResults = await Promise.all(
        referencedLineCardModelCodes.map((code) =>
          oltLineCardModels.getAll({ q: `code:${code}`, size: 1 })
        )
      );
      const byIdResults = await Promise.all(
        referencedLegacyLineCardModelIds.map((modelId) => oltLineCardModels.getById(modelId))
      );

      const merged = [
        ...byCodeResults.flatMap((result: any) => result?.data || []),
        ...byIdResults.filter(Boolean),
      ];
      const unique = Array.from(new Map(merged.map((item: any) => [item.id, item])).values());

      return { data: unique };
    },
    { enabled: canLoadReferencedResources }
  );

  const { data: uplinkCardModelsData, isLoading: isUplinkCardModelsLoading } = useQuery(
    [
      'olt-uplink-card-models-settings',
      referencedUplinkCardModelCodes.join(','),
      referencedLegacyUplinkCardModelIds.join(','),
    ],
    async () => {
      if (referencedUplinkCardModelCodes.length === 0 && referencedLegacyUplinkCardModelIds.length === 0) {
        return oltUplinkCardModels.getAll({ size: 1000, sort: 'name' });
      }

      const byCodeResults = await Promise.all(
        referencedUplinkCardModelCodes.map((code) =>
          oltUplinkCardModels.getAll({ q: `code:${code}`, size: 1 })
        )
      );
      const byIdResults = await Promise.all(
        referencedLegacyUplinkCardModelIds.map((modelId) => oltUplinkCardModels.getById(modelId))
      );

      const merged = [
        ...byCodeResults.flatMap((result: any) => result?.data || []),
        ...byIdResults.filter(Boolean),
      ];
      const unique = Array.from(new Map(merged.map((item: any) => [item.id, item])).values());

      return { data: unique };
    },
    { enabled: canLoadReferencedResources }
  );

  const { data: switchesData, isLoading: isSwitchesLoading } = useQuery(
    ['switches-settings', referencedSwitchIds.join(',')],
    async () => {
      if (referencedSwitchIds.length === 0) {
        return switches.getAll({ size: 1000, sort: 'name' });
      }

      const items = await Promise.all(referencedSwitchIds.map((switchId) => switches.getById(switchId)));
      return { data: items.filter(Boolean) };
    },
    { enabled: canLoadReferencedResources }
  );
  const { data: bngsData, isLoading: isBngsLoading } = useQuery(
    ['bngs-settings', referencedBngIds.join(',')],
    async () => {
      if (referencedBngIds.length === 0) {
        return bngs.getAll({ size: 1000, sort: 'name' });
      }

      const items = await Promise.all(referencedBngIds.map((bngId) => bngs.getById(bngId)));
      return { data: items.filter(Boolean) };
    },
    { enabled: canLoadReferencedResources }
  );
  const { data: bngModelsData, isLoading: isBngModelsLoading } = useQuery(
    ['bng-models-settings'],
    () => bngModels.getAll({ size: 1000, sort: 'name' }),
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

  const uplinkCardModelByCode = useMemo(
    () =>
      new Map(
        (uplinkCardModelsData?.data || [])
          .filter((model: any) => model.code)
          .map((model: any) => [model.code, model])
      ),
    [uplinkCardModelsData]
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

  const settingsPonBySlot = useMemo(
    () =>
      new Map(
        (settingsLinecards.map((item: any) => [Number(item.slot), item]))
      ),
    [settingsLinecards]
  );

  const settingsUplinkBySlot = useMemo(
    () =>
      new Map(
        (settingsUplinks
          .map((item: any) => {
            const match = String(item?.name || '').match(/^uplink(\d+)$/);
            return [match ? Number(match[1]) : null, item] as const;
          })
          .filter(([slotNumber]) => Number.isFinite(slotNumber) && (slotNumber as number) > 0))
      ),
    [settingsUplinks]
  );

  useEffect(() => {
    const ponSlotCount = Number(oltModel?.number_of_pon_slots || 0);
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
  }, [oltModel?.number_of_pon_slots, settingsElements, settingsPonBySlot]);

  useEffect(() => {
    const uplinkSlotCount = Number(oltModel?.number_of_uplink_slots || 0);
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
          switchIpAddress: item?.configuration?.ip_address || '',
          oltPort: item?.configuration?.olt_port || '',
        };
      })
    );
  }, [oltModel?.number_of_uplink_slots, settingsElements, settingsUplinkBySlot]);

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
          switchIpAddress: slot.switchIpAddress || source.configuration?.ip_address || '',
          oltPort: slot.oltPort || source.configuration?.olt_port || '',
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
          return {
            name: `uplink${slot.slotNumber}`,
            olt_uplink_card_model_code:
              (uplinkCardModelsData?.data || []).find(
                (model: any) => model.id === slot.uplinkCardModelId
              )?.code || '',
            configuration: {
              uplink_device_type: 'switch',
              uplink_device_id: slot.switchId || '',
              uplink_interface_name: selectedSwitch?.name || '',
              ip_address: slot.switchIpAddress,
              olt_port: slot.oltPort,
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
    }),
    [
      bngModelById,
      bngSlots,
      bngsData,
      lineCardModelById,
      ponSlots,
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

    const expectedPonSlots = Number(oltModel.number_of_pon_slots || 0);
    const expectedUplinkSlots = Number(oltModel.number_of_uplink_slots || 0);
    if (
      ponSlots.length !== expectedPonSlots ||
      uplinkSlots.length !== expectedUplinkSlots ||
      bngSlots.length !== 2
    ) {
      return;
    }

    const hasAnyExisting =
      settingsLinecards.length > 0 ||
      settingsUplinks.length > 0 ||
      (((settingsElements.bng as any[]) || []).length > 0);

    setHasSavedSettings(hasAnyExisting);
    setHasUnsavedChanges(false);
  }, [
    bngSlots.length,
    oltModel,
    ponSlots.length,
    settingsElements,
    settingsLinecards.length,
    settingsUplinks.length,
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
      const responseData = error?.response?.data;
      const contextMessage =
        responseData?.context?.message ||
        responseData?.detail?.context?.message ||
        null;
      pushResult(
        'error',
        contextMessage ||
          error?.response?.data?.detail?.[0]?.msg ||
          error?.response?.data?.message ||
          'Unable to generate configuration.'
      );
    } finally {
      setIsGeneratingConfig(false);
    }
  };

  useEffect(() => {
    if (!oltModel) {
      return;
    }

    const expectedPonSlots = Number(oltModel?.number_of_pon_slots || 0);
    const expectedUplinkSlots = Number(oltModel?.number_of_uplink_slots || 0);
    const isPonReady = ponSlots.length === expectedPonSlots;
    const isUplinkReady = uplinkSlots.length === expectedUplinkSlots;
    const isBngReady = bngSlots.length === 2;

    if (!isPonReady || !isUplinkReady || !isBngReady) {
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
          uplinkCardModelId:
            uplinkCardModelByCode.get(existingSlot.olt_uplink_card_model_code || '')?.id ||
            existingSlot.olt_uplink_card_model_id ||
            '',
          switchId: configuredSwitchId || configuredSwitch?.id || '',
          switchPort: existingSlot.configuration?.switch_port || '',
          switchIpAddress: existingSlot.configuration?.ip_address || '',
          oltPort: existingSlot.configuration?.olt_port || '',
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
    oltModel?.number_of_pon_slots,
    oltModel?.number_of_uplink_slots,
    settingsElements,
    settingsLinecards,
    settingsUplinks,
    ponSlots.length,
    referencedBngIds.length,
    referencedLineCardModelCodes.length,
    referencedSwitchIds.length,
    referencedUplinkCardModelCodes.length,
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
          payload.elements.bng.length > 0
      );
      setHasUnsavedChanges(false);
    } catch (error: any) {
      pushResult(
        'error',
        error?.response?.data?.detail?.[0]?.msg ||
          error?.response?.data?.message ||
          'Unable to save OLT settings.'
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
    isBngModelsLoading
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
                  {(lineCardModelsData?.data || []).map((model: any) => (
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

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
            Uplink
          </Typography>
          {uplinkSlots.length === 0 && (
            <Alert severity="info">
              No uplink slots found in current OLT settings.
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
                bgcolor: 'grey.100',
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
                {(uplinkCardModelsData?.data || []).map((model: any) => (
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

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
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
            {['Slot', 'BNG', 'Primary', 'Priority'].map((label) => (
              <Typography
                key={label}
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
            Confirm saving the current PON, uplink, and BNG settings for this OLT.
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

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import Layout from '../components/Layout.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import MaterialSymbol from '../components/MaterialSymbol.tsx';
import { oltRenderedConfigurations, olts } from '../services/api.ts';

const detectConfigurationFieldKeys = (entry: any): string[] => {
  if (!entry || typeof entry !== 'object') {
    return [];
  }

  return Object.entries(entry)
    .filter(([key, value]) => {
      if (typeof value !== 'string') {
        return false;
      }
      const normalized = key.toLowerCase();
      return normalized.includes('config') || normalized.includes('template') || normalized.includes('body');
    })
    .map(([key]) => key);
};

const OltRenderedConfigurationDetails: React.FC = () => {
  const { id = '', renderedId = '' } = useParams();
  const navigate = useNavigate();

  const { data: olt } = useQuery(['olt-rendered-olt', id], () => olts.getById(id), {
    enabled: Boolean(id),
  });

  const { data: detailsResponse, isLoading, isError } = useQuery(
    ['olt-rendered-configuration-details', id, renderedId],
    () =>
      oltRenderedConfigurations.getAll({
        page: 1,
        size: 1,
        q: `id:${renderedId}`,
      }),
    { enabled: Boolean(id && renderedId) }
  );

  const data = (detailsResponse?.data || [])[0] || null;
  const viewData = useMemo(() => {
    if (!data) {
      return null;
    }
    const normalized = { ...data };
    delete normalized.olt_id;
    delete normalized.template_id;
    delete normalized.templateid;
    delete normalized.templateId;
    return normalized;
  }, [data]);

  const configurationFieldKeys = useMemo(
    () => detectConfigurationFieldKeys(viewData),
    [viewData]
  );

  const fieldActions = useMemo(() => {
    if (!viewData) {
      return undefined;
    }

    const makeCopyAction = (value: any, label: string) => ({
      icon: <MaterialSymbol name="content_copy" fontSize="small" />,
      label,
      onClick: async () => {
        const rawText =
          typeof value === 'string'
            ? value
            : JSON.stringify(value ?? {}, null, 2);
        const text = rawText.replace(/\\n/g, '\n');
        await navigator.clipboard.writeText(text);
      },
    });

    const actions: Record<string, { icon: React.ReactNode; label: string; onClick: () => void | Promise<void> }> = {};

    configurationFieldKeys.forEach((key) => {
      actions[key] = makeCopyAction(viewData[key], `Copy ${key}`);
    });

    if (viewData.context !== undefined) {
      actions.context = makeCopyAction(viewData.context, 'Copy context');
    }

    return actions;
  }, [configurationFieldKeys, viewData]);

  if (isLoading) {
    return (
      <Layout title="Rendered Configuration Details">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="Rendered Configuration Details">
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<MaterialSymbol name="arrow_back" />}
          onClick={() => navigate(`/olts/${id}/rendered-configurations`)}
        >
          Back
        </Button>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Unable to load rendered configuration details.
        </Alert>
      )}

      <DetailDialog
        open={Boolean(viewData)}
        onClose={() => navigate(`/olts/${id}/rendered-configurations`)}
        title={`Rendered Configuration - ${olt?.name || `OLT #${id}`}`}
        data={viewData}
        fieldActions={fieldActions}
        fullWidthFields={[...configurationFieldKeys, ...(viewData?.context !== undefined ? ['context'] : [])]}
        preformattedFields={configurationFieldKeys}
      />
    </Layout>
  );
};

export default OltRenderedConfigurationDetails;

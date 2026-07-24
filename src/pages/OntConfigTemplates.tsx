import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, TextField, Typography,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import DetailDialog from '../components/DetailDialog.tsx';
import MaterialSymbol from '../components/MaterialSymbol.tsx';
import { FormDialogGrid, FormDialogItem, formDialogActionsSx, formDialogContentSx, formDialogPaperSx, formDialogTitleSx } from '../components/FormDialogLayout.tsx';
import { oltModels, ontConfigTemplates, ontModels } from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

const errorMessage = (error: any) =>
  error?.response?.data?.context?.message || error?.response?.data?.detail?.[0]?.msg || 'Unable to save ONT config template.';

const formatOltModelDisplayName = (model: any, fallback: unknown) =>
  [model?.vendor, model?.name].filter(Boolean).join(' ') || String(fallback);

const OntConfigTemplates: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [viewingSupportedOltModels, setViewingSupportedOltModels] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [template, setTemplate] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(
    ['ont-config-templates', page, rowsPerPage],
    () => ontConfigTemplates.getAll({ page: page + 1, size: rowsPerPage, sort: UPDATED_AT_DESC_SORT }),
  );
  const { data: ontModelsData } = useQuery(['ont-models-select'], () => ontModels.getAll({ size: 1000, sort: 'code' }));
  const { data: oltModelsData } = useQuery(['olt-models-select'], () => oltModels.getAll({ size: 1000, sort: 'code' }));
  const oltModelByCode = useMemo(
    () => new Map((oltModelsData?.data || []).map((model: any) => [model.code, model])),
    [oltModelsData]
  );

  const openDetails = (item: any) => {
    const codes = Array.isArray(item.olt_model_codes)
      ? item.olt_model_codes
      : String(item.olt_model_codes || '').split(',').map((code) => code.trim()).filter(Boolean);
    setViewingSupportedOltModels(
      codes.map((code: string) => formatOltModelDisplayName(oltModelByCode.get(code), code))
    );
    const details = { ...item };
    delete details.olt_model_codes;
    setViewing(details);
    setDetailOpen(true);
  };

  const renderSupportedOltModels = () => {
    if (!viewing || viewingSupportedOltModels.length === 0) return null;

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <MaterialSymbol name="dns" sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="caption" sx={{ color: 'primary.dark', fontWeight: 800, letterSpacing: 0.45 }}>
            SUPPORTED OLT MODELS
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {viewingSupportedOltModels.map((modelName) => (
            <Box
              key={modelName}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.45,
                border: 1, borderColor: 'primary.light', borderRadius: 1.5, bgcolor: '#f4f7ff',
                color: 'primary.main', fontSize: '0.75rem', fontWeight: 600,
              }}
            >
              <MaterialSymbol name="check_circle" sx={{ fontSize: 15 }} />
              {modelName}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFormError(null);
  };
  const openCreate = () => {
    setEditing(null);
    setTemplate('');
    setFormError(null);
    setDialogOpen(true);
  };
  const openEdit = async (item: any) => {
    setFormError(null);
    try {
      const full = await ontConfigTemplates.getById(item.id);
      setEditing(full);
      setTemplate(full.template || '');
      setDialogOpen(true);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.target as HTMLFormElement);
    const payload = {
      name: form.get('name'),
      ont_model_code: form.get('ont_model_code'),
      olt_model_codes: form.getAll('olt_model_codes'),
      phase: form.get('phase'),
      description: form.get('description') || null,
      template,
    };
    try {
      if (editing) await ontConfigTemplates.update(editing.id, payload);
      else await ontConfigTemplates.create(payload);
      await refetch();
      closeDialog();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };
  const previewTemplate = async () => {
    if (!editing) return;
    setFormError(null);
    try {
      const response = await ontConfigTemplates.render(editing.id, {
        ont_port: '1/1/1/1/1', ont_serial: 'ALCL:00000000', ont_type: 'DO',
        sap_id: '1/100.200', svlan: '100', cvlan: '200', video_slot: '3',
      });
      setPreview(response.rendered_template);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  if (isLoading) return <Layout title="ONT Config Templates"><CircularProgress /></Layout>;

  return (
    <Layout title="ONT Config Templates">
      <Box sx={{ mb: 4 }}><Button variant="contained" onClick={openCreate}>Add ONT Config Template</Button></Box>
      <DataTable
        columns={[
          { id: 'name', label: 'Name' }, { id: 'ont_model_code', label: 'ONT Model' },
          { id: 'phase', label: 'Phase' },
          { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
        ]}
        data={data?.data || []} total={data?.pagination?.total || 0} page={page}
        rowsPerPage={rowsPerPage} onPageChange={setPage} onRowsPerPageChange={setRowsPerPage}
        onRowClick={openDetails}
        onEdit={openEdit}
      />
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth PaperProps={{ sx: formDialogPaperSx }}>
        <form onSubmit={save}>
          <DialogTitle sx={formDialogTitleSx}>{editing ? 'Edit ONT Config Template' : 'Create ONT Config Template'}</DialogTitle>
          <DialogContent sx={formDialogContentSx}>
            {formError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{formError}</Alert>}
            <FormDialogGrid>
              <FormDialogItem><TextField autoFocus name="name" label="Name" fullWidth required defaultValue={editing?.name || ''} /></FormDialogItem>
              <FormDialogItem><TextField name="phase" label="Phase" select fullWidth required defaultValue={editing?.phase || 'PRECONFIG'}>
                <MenuItem value="PRECONFIG">PRECONFIG</MenuItem><MenuItem value="CONFIG">CONFIG</MenuItem>
              </TextField></FormDialogItem>
              <FormDialogItem><TextField name="ont_model_code" label="ONT Model" select fullWidth required defaultValue={editing?.ont_model_code || ''}>
                {(ontModelsData?.data || []).map((model: any) => <MenuItem key={model.code} value={model.code}>{model.code} — {model.name}</MenuItem>)}
              </TextField></FormDialogItem>
              <FormDialogItem><TextField name="olt_model_codes" label="Supported OLT Models" select fullWidth required SelectProps={{ multiple: true }} defaultValue={editing?.olt_model_codes || []}>
                {(oltModelsData?.data || []).map((model: any) => <MenuItem key={model.code} value={model.code}>{model.code} — {model.name}</MenuItem>)}
              </TextField></FormDialogItem>
              <FormDialogItem fullWidth><TextField name="description" label="Description" fullWidth defaultValue={editing?.description || ''} /></FormDialogItem>
              <FormDialogItem fullWidth><TextField label="Template" fullWidth required multiline rows={14} value={template} onChange={(event) => setTemplate(event.target.value)} InputProps={{ sx: { fontFamily: 'monospace' } }} /></FormDialogItem>
            </FormDialogGrid>
          </DialogContent>
          <DialogActions sx={formDialogActionsSx}>
            {editing && <Button onClick={previewTemplate}>Preview Sample</Button>}
            <Button onClick={closeDialog}>Cancel</Button><Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
      <DetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="ONT Config Template Details"
        data={viewing}
        fullWidthFields={['template']}
        preformattedFields={['template']}
        extraContent={renderSupportedOltModels()}
        extraContentBeforeMetadata
        extraContentInMainCard
      />
      <DetailDialog open={preview !== null} onClose={() => setPreview(null)} title="Template Preview (sample context)" data={{ rendered_template: preview }} fullWidthFields={['rendered_template']} preformattedFields={['rendered_template']} />
    </Layout>
  );
};

export default OntConfigTemplates;

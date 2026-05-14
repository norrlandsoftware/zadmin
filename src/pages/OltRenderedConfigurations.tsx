import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import Layout from '../components/Layout.tsx';
import DataTable from '../components/DataTable.tsx';
import MaterialSymbol from '../components/MaterialSymbol.tsx';
import { oltRenderedConfigurations, olts } from '../services/api.ts';
import { formatTableDateTime, UPDATED_AT_DESC_SORT } from '../utils/table.ts';

const formatOptional = (value: any) =>
  value === null || value === undefined || value === '' ? 'N/A' : String(value);

const OltRenderedConfigurations: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data: olt } = useQuery(['olt-rendered-olt', id], () => olts.getById(id), {
    enabled: Boolean(id),
  });

  const { data, isLoading, isError } = useQuery(
    ['olt-rendered-configurations', id, page, rowsPerPage],
    () =>
      oltRenderedConfigurations.getAll({
        page: page + 1,
        size: rowsPerPage,
        sort: UPDATED_AT_DESC_SORT,
        q: `olt_id:${id}`,
      }),
    { enabled: Boolean(id) }
  );

  const columns = useMemo(
    () => [
      { id: 'name', label: 'Name', format: formatOptional },
      { id: 'type', label: 'Type', format: formatOptional },
      { id: 'created_at', label: 'Created At', format: formatTableDateTime },
      { id: 'updated_at', label: 'Updated At', format: formatTableDateTime },
    ],
    []
  );

  if (isLoading) {
    return (
      <Layout title="Rendered Configurations">
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout title="Rendered Configurations">
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="outlined" startIcon={<MaterialSymbol name="arrow_back" />} onClick={() => navigate('/olts')}>
          Back
        </Button>
        <Typography variant="h6">{olt?.name || `OLT #${id}`}</Typography>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Unable to load rendered configurations.
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={data?.data || []}
        total={data?.pagination?.total || 0}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRowClick={(row) => navigate(`/olts/${id}/rendered-configurations/${row.id}`)}
      />
    </Layout>
  );
};

export default OltRenderedConfigurations;

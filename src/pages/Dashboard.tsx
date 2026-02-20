import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import { pops, olts, onts } from '../services/api.ts';

const Dashboard: React.FC = () => {
  const { data: popsData, isLoading: popsLoading } = useQuery(['pops'], () =>
    pops.getAll()
  );
  const { data: oltsData, isLoading: oltsLoading } = useQuery(['olts'], () =>
    olts.getAll()
  );
  const { data: ontsData, isLoading: ontsLoading } = useQuery(['onts'], () =>
    onts.getAll()
  );

  const isLoading = popsLoading || oltsLoading || ontsLoading;

  if (isLoading) {
    return (
      <Layout>
        <CircularProgress />
      </Layout>
    );
  }

  return (
    <Layout>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2">
                POPs
              </Typography>
              <Typography variant="h3" component="p">
                {popsData?.pagination.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2">
                OLTs
              </Typography>
              <Typography variant="h3" component="p">
                {oltsData?.pagination.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2">
                ONTs
              </Typography>
              <Typography variant="h3" component="p">
                {ontsData?.pagination.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default Dashboard;
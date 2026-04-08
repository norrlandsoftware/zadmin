import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Link,
  Typography,
} from '@mui/material';
import Layout from '../components/Layout.tsx';
import { appInfo } from '../services/api.ts';
import packageJson from '../../package.json';

const About: React.FC = () => {
  const { data, isLoading, error } = useQuery(['api-info'], () =>
    appInfo.getApiInfo()
  );

  return (
    <Layout title="About">
      <Card variant="outlined">
        <CardContent>
          {isLoading ? (
            <CircularProgress />
          ) : error ? (
            <Alert severity="error">
              Unable to load API information.
            </Alert>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                  ZADMIN Version
                </Typography>
                <Typography variant="body1">{packageJson.version}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                  ZAPI Version
                </Typography>
                <Typography variant="body1">{data?.version || 'N/A'}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                  ZTROOM Contact
                </Typography>
                <Typography variant="body1">{data?.contact?.name || 'N/A'}</Typography>
                {data?.contact?.url && (
                  <Typography variant="body2">
                    <Link href={data.contact.url} target="_blank" rel="noreferrer">
                      {data.contact.url}
                    </Link>
                  </Typography>
                )}
                {data?.contact?.email && (
                  <Typography variant="body2">{data.contact.email}</Typography>
                )}
                {data?.contact?.phone && (
                  <Typography variant="body2">{data.contact.phone}</Typography>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default About;

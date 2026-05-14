import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Box, IconButton, Stack, Typography } from '@mui/material';
import MaterialSymbol from '../components/MaterialSymbol.tsx';

type ResultType = 'success' | 'error';

interface ResultBarItem {
  id: string;
  type: ResultType;
  message: string;
}

interface ResultBarContextValue {
  pushResult: (type: ResultType, message: string) => void;
}

const ResultBarContext = createContext<ResultBarContextValue | undefined>(undefined);

export const useResultBar = () => {
  const context = useContext(ResultBarContext);
  if (!context) {
    throw new Error('useResultBar must be used inside ResultBarProvider');
  }
  return context;
};

export const ResultBarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ResultBarItem[]>([]);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushResult = useCallback(
    (type: ResultType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setItems((current) => [...current, { id, type, message }]);
      window.setTimeout(() => removeItem(id), 5000);
    },
    [removeItem]
  );

  const value = useMemo(() => ({ pushResult }), [pushResult]);

  return (
    <ResultBarContext.Provider value={value}>
      {children}
      <Box
        sx={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          width: { xs: 'calc(100% - 24px)', sm: 640 },
          maxWidth: 'calc(100vw - 24px)',
        }}
      >
        <Stack spacing={1}>
          {items.map((item) => (
            <Alert
              key={item.id}
              severity={item.type}
              sx={{
                alignItems: 'flex-start',
                '& .MuiAlert-message': { width: '100%' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%' }}>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1, pt: 0.1 }}
                >
                  {item.message}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => navigator.clipboard.writeText(item.message)}
                  sx={{ mt: -0.25 }}
                >
                  <MaterialSymbol name="content_copy" fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => removeItem(item.id)} sx={{ mt: -0.25 }}>
                  <MaterialSymbol name="close" fontSize="small" />
                </IconButton>
              </Box>
            </Alert>
          ))}
        </Stack>
      </Box>
    </ResultBarContext.Provider>
  );
};

import React from 'react';
import { Box, Typography } from '@mui/material';

export const formDialogFieldSx = {
  mt: 0,
  '& .MuiFormLabel-asterisk': {
    color: 'inherit',
  },
  '& .MuiInputLabel-root': {
    fontSize: '1.2rem',
    color: 'text.primary',
  },
  '& .MuiInputLabel-root:not(.MuiInputLabel-shrink)': {
    color: 'text.primary',
    transform: 'translate(14px, 6px) scale(1)',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'primary.main',
    transform: 'translate(14px, -12px) scale(0.75)',
    backgroundColor: 'background.paper',
    padding: '0 4px',
    borderRadius: '4px',
    maxWidth: 'calc(100% - 24px)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'primary.main',
  },
  '& .MuiInputBase-root': {
    fontSize: '0.82rem',
    minHeight: 34,
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderWidth: '1.5px',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderWidth: '1.5px',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderWidth: '2px',
  },
  '& .MuiOutlinedInput-input': {
    padding: '8px 10px',
    lineHeight: 1.35,
  },
  '& .MuiOutlinedInput-input.MuiInputBase-inputMultiline': {
    padding: 0,
  },
  '& .MuiOutlinedInput-root.MuiInputBase-multiline': {
    padding: '8px 10px',
  },
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    marginRight: 0,
    fontSize: '0.74rem',
    lineHeight: 1.35,
  },
} as const;

export const formDialogPaperSx = {
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'min(90vh, 920px)',
} as const;

export const formDialogTitleSx = {
  pb: 1,
  position: 'sticky',
  top: 0,
  zIndex: 2,
  backgroundColor: 'background.paper',
  borderBottom: 1,
  borderColor: 'divider',
} as const;

export const formDialogContentSx = {
  pt: '20px !important',
  pb: 2,
  flex: 1,
  overflowY: 'auto',
  '& .MuiTextField-root': formDialogFieldSx,
  '& .MuiFormControl-root': formDialogFieldSx,
} as const;

export const formDialogActionsSx = {
  px: 3,
  py: 2,
  position: 'sticky',
  bottom: 0,
  zIndex: 2,
  backgroundColor: 'background.paper',
  borderTop: 1,
  borderColor: 'divider',
} as const;

export const FormDialogGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
      gap: 1.5,
      alignItems: 'start',
    }}
  >
    {children}
  </Box>
);

export const FormDialogItem: React.FC<{ children: React.ReactNode; fullWidth?: boolean }> = ({
  children,
  fullWidth = false,
}) => (
  <Box sx={{ gridColumn: { xs: 'auto', md: fullWidth ? '1 / -1' : 'auto' } }}>
    {children}
  </Box>
);

export const FormDialogSectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="subtitle2" sx={{ mb: 0.75, mt: 0.5, fontWeight: 600 }}>
    {children}
  </Typography>
);

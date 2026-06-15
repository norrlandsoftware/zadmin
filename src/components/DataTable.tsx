import React from 'react';
import MaterialSymbol from './MaterialSymbol.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  IconButton,
  Tooltip,
} from '@mui/material';

interface Column {
  id: string;
  label: string;
  format?: (value: any, row?: any) => string | React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onRowClick?: (row: any) => void;
  onTroubleshoot?: (row: any) => void;
  onConfigure?: (row: any) => void;
  onDocument?: (row: any) => void;
  onTransfer?: (row: any) => void;
  onUpload?: (row: any) => void;
  onDownload?: (row: any) => void;
  isConfigureDisabled?: (row: any) => boolean;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onEdit,
  onDelete,
  onRowClick,
  onTroubleshoot,
  onConfigure,
  onDocument,
  onTransfer,
  onUpload,
  onDownload,
  isConfigureDisabled,
}) => {
  const hasActions = Boolean(
    onView ||
      onEdit ||
      onDelete ||
      onTroubleshoot ||
      onConfigure ||
      onDocument ||
      onTransfer ||
      onUpload ||
      onDownload
  );
  const showViewAction = Boolean(onView) && !onRowClick;
  const actionCount = [
    showViewAction,
    onTroubleshoot,
    onConfigure,
    onDocument,
    onTransfer,
    onUpload,
    onDownload,
    onEdit,
    onDelete,
  ].filter(Boolean).length;
  const ACTION_ICON_SIZE = 18;
  const ACTION_BUTTON_SIZE = 28;
  const actionsColumnWidth = hasActions ? Math.max(96, actionCount * ACTION_BUTTON_SIZE) : 0;
  const dataColumnWidth = hasActions
    ? `calc((100% - ${actionsColumnWidth}px) / ${columns.length})`
    : `${100 / columns.length}%`;

  const headerCellSx = {
    backgroundColor: 'primary.main',
    color: 'white',
    fontWeight: 600,
    py: 1,
    fontSize: '0.875rem',
    whiteSpace: { xs: 'normal', sm: 'nowrap' },
    overflowWrap: 'anywhere',
  };

  const bodyCellSx = {
    py: 0.75,
    fontSize: '0.875rem',
    lineHeight: 1.35,
    overflowWrap: 'anywhere',
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onRowsPerPageChange(parseInt(event.target.value, 10));
    onPageChange(0);
  };

  return (
    <Paper>
      <TableContainer>
        <Table
          stickyHeader
          size="small"
          aria-label="sticky table"
          sx={{
            width: '100%',
            tableLayout: 'fixed',
          }}
        >
          <colgroup>
            {columns.map((column) => (
              <col key={column.id} style={{ width: dataColumnWidth }} />
            ))}
            {hasActions && (
              <col style={{ width: `${actionsColumnWidth}px` }} />
            )}
          </colgroup>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} sx={headerCellSx}>
                  {column.label}
                </TableCell>
              ))}
              {hasActions && (
                <TableCell sx={headerCellSx}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow 
                hover 
                role="checkbox" 
                tabIndex={-1} 
                key={index}
                onClick={() => onRowClick && onRowClick(row)}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((column) => {
                  const value = row[column.id];
                  return (
                    <TableCell key={column.id} sx={bodyCellSx}>
                      {column.format ? column.format(value, row) : value}
                    </TableCell>
                  );
                })}
                {hasActions && (
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      ...bodyCellSx,
                      whiteSpace: 'nowrap',
                      width: `${actionsColumnWidth}px`,
                      px: 0.5,
                    }}
                  >
                    {showViewAction && (
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => onView(row)}
                          color="info"
                          sx={{ p: 0.5 }}
                        >
                          <MaterialSymbol name="visibility" sx={{ fontSize: ACTION_ICON_SIZE }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onTroubleshoot && (
                      <Tooltip title="Troubleshoot">
                        <IconButton
                          size="small"
                          onClick={() => onTroubleshoot(row)}
                          color="primary"
                          sx={{ p: 0.5 }}
                        >
                          <MaterialSymbol name="build" sx={{ fontSize: ACTION_ICON_SIZE }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onConfigure && (
                      <Tooltip title="Configure">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onConfigure(row)}
                            color="primary"
                            sx={{ p: 0.5 }}
                            disabled={Boolean(isConfigureDisabled?.(row))}
                          >
                            <MaterialSymbol name="settings" sx={{ fontSize: ACTION_ICON_SIZE }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {onDocument && (
                      <Tooltip title="View Rendered Configuration">
                        <IconButton
                          size="small"
                          onClick={() => onDocument(row)}
                          color="primary"
                          sx={{ p: 0.5 }}
                        >
                          <MaterialSymbol name="description" sx={{ fontSize: ACTION_ICON_SIZE }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onTransfer && (
                      <Tooltip title="TFTP File Transfer">
                        <IconButton
                          size="small"
                          onClick={() => onTransfer(row)}
                          color="primary"
                          sx={{ p: 0.5 }}
                        >
                          <MaterialSymbol name="send" sx={{ fontSize: ACTION_ICON_SIZE }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onUpload && (
                      <Tooltip title="Upload Replacement File">
                        <IconButton
                          size="small"
                          onClick={() => onUpload(row)}
                          color="primary"
                          sx={{ p: 0.5 }}
                        >
                          <MaterialSymbol name="upload" sx={{ fontSize: ACTION_ICON_SIZE }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDownload && (
                      <Tooltip title="Download File">
                        <IconButton
                          size="small"
                          onClick={() => onDownload(row)}
                          color="primary"
                          sx={{ p: 0.5 }}
                        >
                          <MaterialSymbol name="download" sx={{ fontSize: ACTION_ICON_SIZE }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onEdit && (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => onEdit(row)}
                          color="primary"
                          sx={{ p: 0.5 }}
                        >
                          <MaterialSymbol name="edit" sx={{ fontSize: ACTION_ICON_SIZE }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDelete && (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => onDelete(row)}
                          color="error"
                          sx={{ p: 0.5 }}
                        >
                          <MaterialSymbol name="delete" sx={{ fontSize: ACTION_ICON_SIZE }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default DataTable;

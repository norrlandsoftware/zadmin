import React from 'react';
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BuildIcon from '@mui/icons-material/Build';
import SettingsIcon from '@mui/icons-material/Settings';

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
  isConfigureDisabled,
}) => {
  const hasActions = Boolean(onView || onEdit || onDelete || onTroubleshoot || onConfigure);
  const actionCount = [onView, onTroubleshoot, onConfigure, onEdit, onDelete].filter(Boolean).length;
  const actionsColumnWidth = hasActions ? Math.max(112, actionCount * 32) : 0;
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
                    }}
                  >
                    {onView && (
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => onView(row)}
                          color="info"
                          sx={{ p: 0.5 }}
                        >
                          <VisibilityIcon />
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
                          <BuildIcon />
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
                            <SettingsIcon />
                          </IconButton>
                        </span>
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
                          <EditIcon />
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
                          <DeleteIcon />
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

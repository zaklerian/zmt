import { Box, Button, type Theme } from '@mui/material';
import {
  ColumnsPanelTrigger,
  DataGrid,
  GridColDef,
  GridRowClassNameParams,
  GridRowSelectionModel,
  Toolbar,
} from '@mui/x-data-grid';
import {
  Action,
  EntityActionEnvironment,
  EntityRow,
  EntitySortKey,
  EntityTableData,
  EntityToolbarContext,
} from '@r-core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

declare module '@mui/x-data-grid' {
  interface ToolbarPropsOverrides {
    actions: readonly Action<EntityToolbarContext>[];
    context: EntityToolbarContext;
  }
}

interface EntityGridRow {
  readonly cells: Readonly<Record<string, string>>;
  readonly id: string;
}

interface EntityTableProps {
  readonly actionEnv: EntityActionEnvironment;
  readonly data: EntityTableData;
  onSelectRow: (rowId: null | string) => void;
  selectedRowId: null | string;
  readonly writable: boolean;
}

const ROW_STATE_SX = {
  '& .entity-row--error': { color: 'error.main' },
  '& .entity-row--muted': { color: 'text.secondary' },
  '& .entity-row--warning': { color: 'warning.main' },
  '& .MuiDataGrid-cell:focus': { outline: 'none' },
  '& .MuiDataGrid-cell:focus-within': { outline: 'none' },
  '& .MuiDataGrid-columnHeader:focus': { outline: 'none' },
  '& .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
  '& .MuiDataGrid-row.Mui-selected': {
    outline: ({ palette }: Theme) => `2px solid ${palette.primary.main}`,
    outlineOffset: '-2px',
  },
} as const;

export function EntityTable({
  actionEnv,
  data,
  onSelectRow,
  selectedRowId,
  writable,
}: EntityTableProps) {
  const { t } = useTranslation(['feature.modContent']);
  // Recognizer header keys are runtime data, not literals the typed t() knows.
  const translateHeader = t as (key: string) => string;

  const toolbarContext = useMemo<EntityToolbarContext>(
    () => ({ ...actionEnv, selectedRowId, writable }),
    [actionEnv, selectedRowId, writable],
  );

  const sortedRows = useMemo(
    () => sortRows(data.rows, data.defaultSort),
    [data.defaultSort, data.rows],
  );

  const stateById = useMemo(
    () => new Map(sortedRows.map((row) => [row.id, row.state])),
    [sortedRows],
  );

  const gridRows = useMemo<readonly EntityGridRow[]>(
    () => sortedRows.map((row) => ({ cells: row.cells, id: row.id })),
    [sortedRows],
  );

  const columns = useMemo<GridColDef<EntityGridRow>[]>(
    () =>
      data.columns.map((column) => ({
        field: column.id,
        flex: 1,
        headerName: translateHeader(column.headerKey),
        sortable: column.sortable,
        valueGetter: (_value, row) => row.cells[column.id] ?? '',
      })),
    [data.columns, translateHeader],
  );

  const initialState = useMemo(() => {
    const [first] = data.defaultSort;
    if (first === undefined) return undefined;
    return {
      sorting: {
        sortModel: [{ field: first.columnId, sort: first.direction }],
      },
    };
  }, [data.defaultSort]);

  const rowSelectionModel = useMemo<GridRowSelectionModel>(
    () => ({
      ids: new Set(selectedRowId === null ? [] : [selectedRowId]),
      type: 'include',
    }),
    [selectedRowId],
  );

  const getRowClassName = (params: GridRowClassNameParams<EntityGridRow>) =>
    `entity-row--${stateById.get(String(params.id)) ?? 'normal'}`;

  const handleRowSelectionModelChange = (model: GridRowSelectionModel) => {
    const [first] = [...model.ids];
    onSelectRow(first === undefined ? null : String(first));
  };

  return (
    <DataGrid<EntityGridRow>
      columns={columns}
      disableColumnFilter
      disableColumnMenu
      disableMultipleRowSelection
      getRowClassName={getRowClassName}
      initialState={initialState}
      rowSelectionModel={rowSelectionModel}
      rows={[...gridRows]}
      showToolbar
      slotProps={{
        toolbar: { actions: data.actions ?? [], context: toolbarContext },
      }}
      slots={{ toolbar: EntityTableToolbar }}
      sx={ROW_STATE_SX}
      onRowSelectionModelChange={handleRowSelectionModelChange}
    />
  );
}

function EntityTableToolbar({
  actions,
  context,
}: {
  readonly actions: readonly Action<EntityToolbarContext>[];
  readonly context: EntityToolbarContext;
}) {
  const { t } = useTranslation(['feature.modContent']);
  // Action labels are runtime keys from the recognizer's namespace, not literals
  // the typed t() knows.
  const translateLabel = t as (key: string) => string;
  const available = actions.filter((action) => action.isAvailable(context));

  return (
    <Toolbar>
      {available.map((action) => (
        <Button
          key={action.id}
          size="small"
          onClick={() => void action.execute(context)}
        >
          {translateLabel(action.label(context))}
        </Button>
      ))}
      <Box sx={{ flex: 1 }} />
      <ColumnsPanelTrigger>
        {t('feature.modContent:entityTable.columns')}
      </ColumnsPanelTrigger>
    </Toolbar>
  );
}

function sortRows(
  rows: readonly EntityRow[],
  sortKeys: readonly EntitySortKey[],
): readonly EntityRow[] {
  if (sortKeys.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const { columnId, direction } of sortKeys) {
      const factor = direction === 'asc' ? 1 : -1;
      const compared = (a.cells[columnId] ?? '').localeCompare(
        b.cells[columnId] ?? '',
      );
      if (compared !== 0) return compared * factor;
    }
    return 0;
  });
}

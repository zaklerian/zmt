import {
  ColumnsPanelTrigger,
  DataGrid,
  GridColDef,
  GridRowClassNameParams,
  GridRowSelectionModel,
  Toolbar,
} from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  EntityRow,
  EntitySortKey,
  EntityTableData,
} from '../../../shared/recognizer';

interface EntityGridRow {
  readonly cells: Readonly<Record<string, string>>;
  readonly id: string;
}

interface EntityTableProps {
  readonly data: EntityTableData;
  onSelectRow: (rowId: null | string) => void;
  selectedRowId: null | string;
}

const ROW_STATE_SX = {
  '& .entity-row--error': { color: 'error.main' },
  '& .entity-row--muted': { color: 'text.secondary' },
  '& .entity-row--warning': { color: 'warning.main' },
} as const;

export function EntityTable({
  data,
  onSelectRow,
  selectedRowId,
}: EntityTableProps) {
  const { t } = useTranslation(['feature.modContent']);
  // Recognizer header keys are runtime data, not literals the typed t() knows.
  const translateHeader = t as (key: string) => string;

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
      slots={{ toolbar: EntityTableToolbar }}
      sx={ROW_STATE_SX}
      onRowSelectionModelChange={handleRowSelectionModelChange}
    />
  );
}

function EntityTableToolbar() {
  const { t } = useTranslation(['feature.modContent']);
  return (
    <Toolbar>
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

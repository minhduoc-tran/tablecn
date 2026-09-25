import {
  assignPrototypeAPIs,
  assignTableAPIs,
  makeStateUpdater,
  type OnChangeFn,
  type RowData,
  type TableFeature,
  type TableFeatures,
  type Updater,
} from "@tanstack/react-table"

/** Background color per column id: a preset token or any CSS color. */
export type ColumnColorsState = Record<string, string>

export interface TableState_ColumnColor {
  columnColors: ColumnColorsState
}

export interface TableOptions_ColumnColor {
  onColumnColorsChange?: OnChangeFn<ColumnColorsState>
}

export interface Table_ColumnColor {
  setColumnColors: (updater: Updater<ColumnColorsState>) => void
  /** Back to `initialState.columnColors`, or no colors with `true`. */
  resetColumnColors: (defaultState?: boolean) => void
}

export interface Column_ColumnColor {
  getColor: () => string | undefined
  /** `undefined` removes the color. */
  setColor: (color: string | undefined) => void
}

// Type parameters must match the interfaces being merged, used or not.
/* eslint-disable @typescript-eslint/no-unused-vars */
declare module "@tanstack/react-table" {
  interface Plugins {
    columnColorFeature: TableFeature
  }
  interface TableState_FeatureMap {
    columnColorFeature: TableState_ColumnColor
  }
  interface TableOptions_FeatureMap<
    TFeatures extends TableFeatures,
    TData extends RowData,
  > {
    columnColorFeature: TableOptions_ColumnColor
  }
  interface Table_FeatureMap<
    TFeatures extends TableFeatures,
    TData extends RowData,
  > {
    columnColorFeature: Table_ColumnColor
  }
  interface Column_FeatureMap<
    TFeatures extends TableFeatures,
    TData extends RowData,
  > {
    columnColorFeature: Column_ColumnColor
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// The feature's own view of the table, so it doesn't depend on which other features are on.
interface ColorTable {
  initialState: Partial<TableState_ColumnColor>
  options: TableOptions_ColumnColor
  atoms: { columnColors?: { get: () => ColumnColorsState | undefined } }
}

const setColors = (table: ColorTable, updater: Updater<ColumnColorsState>) =>
  table.options.onColumnColorsChange?.(updater)

/** Column background colors as TanStack Table state: `column.getColor()`, `column.setColor()`. */
export const columnColorFeature: TableFeature = {
  getInitialState: (initialState) => ({
    columnColors: {},
    ...initialState,
  }),

  getDefaultTableOptions: (table) => ({
    onColumnColorsChange: makeStateUpdater("columnColors", table),
  }),

  constructTableAPIs: (table) => {
    const colorTable = table as unknown as ColorTable
    assignTableAPIs("columnColorFeature", table, {
      table_setColumnColors: {
        fn: (updater: Updater<ColumnColorsState>) =>
          setColors(colorTable, updater),
      },
      table_resetColumnColors: {
        fn: (defaultState?: boolean) =>
          setColors(
            colorTable,
            defaultState ? {} : { ...colorTable.initialState.columnColors }
          ),
      },
    })
  },

  assignColumnPrototype: (prototype, table) => {
    const colorTable = table as unknown as ColorTable
    assignPrototypeAPIs("columnColorFeature", prototype, table, {
      column_getColor: {
        fn: (column: { id: string }) => {
          const colors = colorTable.atoms.columnColors?.get()
          return colors &&
            Object.prototype.hasOwnProperty.call(colors, column.id)
            ? colors[column.id]
            : undefined
        },
      },
      column_setColor: {
        fn: (column: { id: string }, color: string | undefined) =>
          setColors(colorTable, (old) =>
            Object.fromEntries([
              ...Object.entries(old).filter(([id]) => id !== column.id),
              ...(color === undefined ? [] : [[column.id, color]]),
            ])
          ),
      },
    })
  },
}

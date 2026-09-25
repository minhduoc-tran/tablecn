"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useDndContext,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type KeyboardSensorOptions,
  type KeyboardSensorProps,
  type Modifier,
  type PointerSensorOptions,
  type PointerSensorProps,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import type { DataTableInstance, TableMessages } from "@querycn/table-react"

import { getColumnLabel } from "@/registry/shared/table/column-label"
import { getListedColumns } from "@/registry/shared/table/column-layout-actions"

type Group = "start" | "center" | "end"
type Column<TData extends object> = ReturnType<
  DataTableInstance<TData>["getAllLeafColumns"]
>[number]

const groupOf = (column: { getIsPinned: () => false | Group }): Group =>
  column.getIsPinned() || "center"

/** `meta.enableOrdering: false`, or pinned for good, keeps a column in place. */
function isMovable<TData extends object>(column: Column<TData>) {
  if (column.columnDef.meta?.enableOrdering === false) return false
  return !(column.getIsPinned() && !column.getCanPin())
}

/** Moves `from` to `to`'s place among the movable ids; the others keep theirs. */
function moveAmong(
  ids: string[],
  from: string,
  to: string,
  isMovable: (id: string) => boolean
) {
  const movable = ids.filter(isMovable)
  const moved = arrayMove(movable, movable.indexOf(from), movable.indexOf(to))
  let next = 0
  return ids.map((id) => (isMovable(id) ? moved[next++]! : id))
}

// Pinned columns move within their pinned group only.
const sameGroup: CollisionDetection = (args) =>
  closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) =>
        container.data.current?.movable &&
        container.data.current.group === args.active.data.current?.group
    ),
  })

type Axis = "x" | "y"

const alongAxis: Record<Axis, Modifier> = {
  x: ({ transform }) => ({ ...transform, y: 0 }),
  y: ({ transform }) => ({ ...transform, x: 0 }),
}

const AxisContext = React.createContext<Axis>("x")

// A sensor keeps listening on the document until the drag ends, even once its
// DndContext unmounts (a popover closing mid-drag); the next Enter would drop.
// These report themselves so `ColumnReorder` can stop them when it unmounts.
interface Detachable {
  detach: () => void
}
interface Tracked {
  onAttach?: (sensor: Detachable) => void
}

class TrackedKeyboardSensor extends KeyboardSensor {
  constructor(props: KeyboardSensorProps) {
    super(props)
    ;(props.options as Tracked).onAttach?.(this as unknown as Detachable)
  }
}

class TrackedPointerSensor extends PointerSensor {
  constructor(props: PointerSensorProps) {
    super(props)
    ;(props.options as Tracked).onAttach?.(this as unknown as Detachable)
  }
}

/**
 * Lets header cells be dragged (by `useColumnDrag`'s handle) to reorder
 * columns: the column order for unpinned columns, the pinned order for pinned
 * ones. Wrap the table in it, or with `axis="y"` a list of every column,
 * hidden ones included.
 */
export function ColumnReorder<TData extends object>({
  table,
  messages,
  axis = "x",
  onDraggingChange,
  children,
}: {
  table: DataTableInstance<TData>
  messages: TableMessages
  axis?: Axis
  /** E.g. to keep a popover around the list open while a column moves. */
  onDraggingChange?: (dragging: boolean) => void
  children: React.ReactNode
}) {
  // Stable ids for the screen reader descriptions, so server and client HTML match.
  const id = React.useId()
  const sensor = React.useRef<Detachable | null>(null)
  const onAttach = React.useCallback((attached: Detachable) => {
    sensor.current = attached
  }, [])
  React.useEffect(() => () => sensor.current?.detach(), [])
  const sensors = useSensors(
    useSensor(TrackedPointerSensor, {
      activationConstraint: { distance: 4 },
      onAttach,
    } as PointerSensorOptions & Tracked),
    useSensor(TrackedKeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      onAttach,
    } as KeyboardSensorOptions & Tracked)
  )
  const columns =
    axis === "y"
      ? getListedColumns(table)
      : [
          ...table.getStartVisibleLeafColumns(),
          ...table.getCenterVisibleLeafColumns(),
          ...table.getEndVisibleLeafColumns(),
        ]
  // While dragging, only the columns that can trade places with it make room.
  const [activeGroup, setActiveGroup] = React.useState<Group | null>(null)
  const items = columns
    .filter(
      (column) =>
        isMovable(column) && (!activeGroup || groupOf(column) === activeGroup)
    )
    .map((column) => column.id)

  const describe = (id: UniqueIdentifier) => {
    const column = table.getColumn(String(id))
    if (!column) return { label: String(id), position: 0, total: 0 }
    const group = columns.filter((c) => groupOf(c) === groupOf(column))
    return {
      label: getColumnLabel(column),
      position: group.findIndex((c) => c.id === column.id) + 1,
      total: group.length,
    }
  }
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      messages.header.pickedUp(describe(active.id).label),
    onDragOver: ({ active, over }) => {
      if (!over) return
      const { position, total } = describe(over.id)
      return messages.header.movedTo(describe(active.id).label, position, total)
    },
    onDragEnd: ({ active, over }) => {
      if (!over) return messages.header.cancelled(describe(active.id).label)
      const { position, total } = describe(over.id)
      return messages.header.dropped(describe(active.id).label, position, total)
    },
    onDragCancel: ({ active }) =>
      messages.header.cancelled(describe(active.id).label),
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveGroup(null)
    onDraggingChange?.(false)
    const from = table.getColumn(String(active.id))
    const to = over && table.getColumn(String(over.id))
    if (!from || !to || from.id === to.id) return
    const group = groupOf(from)
    if (group !== groupOf(to)) return
    const canMove = (id: string) => {
      const column = table.getColumn(id)
      return column !== undefined && isMovable(column)
    }
    const move = (ids: string[]) => moveAmong(ids, from.id, to.id, canMove)
    if (group === "center") table.setColumnOrder((order) => move(order))
    else {
      table.setColumnPinning((pinning) => ({
        ...pinning,
        [group]: move(pinning[group]),
      }))
    }
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={sameGroup}
      modifiers={[alongAxis[axis]]}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: messages.header.instructions },
      }}
      onDragStart={({ active }) => {
        setActiveGroup(active.data.current?.group ?? null)
        onDraggingChange?.(true)
      }}
      onDragCancel={() => {
        setActiveGroup(null)
        onDraggingChange?.(false)
      }}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items}
        strategy={
          axis === "y"
            ? verticalListSortingStrategy
            : horizontalListSortingStrategy
        }
      >
        <AxisContext value={axis}>{children}</AxisContext>
      </SortableContext>
    </DndContext>
  )
}

/** A header cell's or list item's part in `ColumnReorder`: its node, drag handles and offset while moving. */
export function useColumnDrag<TData extends object>(
  column: Column<TData>,
  canReorder: boolean
) {
  const axis = React.use(AxisContext)
  const group = groupOf(column)
  const enabled = canReorder && isMovable(column)
  const { active } = useDndContext()
  // Keyboard moves pick the next droppable column, so other groups step aside too.
  const otherGroup = active !== null && active.data.current?.group !== group
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: { draggable: !enabled, droppable: !enabled || otherGroup },
    data: { group, movable: enabled },
  })
  return {
    disabled: !enabled,
    setNodeRef,
    // The pointer drags the header itself (a click without moving still sorts);
    // the keyboard picks the column up from a handle.
    pointerProps: {
      onPointerDown: listeners?.onPointerDown as
        React.PointerEventHandler | undefined,
    },
    setHandleRef: setActivatorNodeRef,
    handleProps: {
      ...attributes,
      onKeyDown: listeners?.onKeyDown as React.KeyboardEventHandler | undefined,
    },
    isDragging,
    style: {
      transform: transform
        ? axis === "y"
          ? `translate3d(0, ${Math.round(transform.y)}px, 0)`
          : `translate3d(${Math.round(transform.x)}px, 0, 0)`
        : undefined,
      transition,
    } satisfies React.CSSProperties,
  }
}

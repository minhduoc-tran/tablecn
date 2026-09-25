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
  type Modifier,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import type { DataTableInstance, TableMessages } from "@querycn/table-react"

import { getColumnLabel } from "@/registry/shared/table/column-label"

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

const alongRow: Modifier = ({ transform }) => ({ ...transform, y: 0 })

/**
 * Lets header cells be dragged (by `useColumnDrag`'s handle) to reorder
 * columns: the column order for unpinned columns, the pinned order for pinned
 * ones. Wrap the table in it.
 */
export function ColumnReorder<TData extends object>({
  table,
  messages,
  children,
}: {
  table: DataTableInstance<TData>
  messages: TableMessages
  children: React.ReactNode
}) {
  // Stable ids for the screen reader descriptions, so server and client HTML match.
  const id = React.useId()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const columns = [
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
      modifiers={[alongRow]}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: messages.header.instructions },
      }}
      onDragStart={({ active }) =>
        setActiveGroup(active.data.current?.group ?? null)
      }
      onDragCancel={() => setActiveGroup(null)}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

/** A header cell's part in `ColumnReorder`: its node, drag handles and offset while moving. */
export function useColumnDrag<TData extends object>(
  column: Column<TData>,
  canReorder: boolean
) {
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
        ? `translate3d(${Math.round(transform.x)}px, 0, 0)`
        : undefined,
      transition,
    } satisfies React.CSSProperties,
  }
}

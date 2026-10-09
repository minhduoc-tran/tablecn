"use client"

import * as React from "react"
import type { TableMessages } from "@querycn/table-react"
import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"

import { Button } from "@/registry/aria/ui/button"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/aria/ui/dialog"
import type { BulkEditState } from "@/registry/shared/table/use-bulk-edit"
import type { CellEditors } from "@/registry/aria/table/data-table-cell-editors"
import { DataTableBulkEditField } from "@/registry/aria/table/data-table-bulk-edit-field"

export interface DataTableBulkEditDialogProps<TData extends object> {
  /** From `useBulkEdit`. */
  bulk: BulkEditState<TData>
  editors: CellEditors
  messages: TableMessages
}

/**
 * A Bulk edit button and its dialog: pick columns, give each a value, and
 * apply them to every selected row. Each value has its column's cell editor.
 */
export function DataTableBulkEditDialog<TData extends object>({
  bulk,
  editors,
  messages,
}: DataTableBulkEditDialogProps<TData>) {
  const lastPicker = React.useRef<HTMLButtonElement>(null)
  const focusLast = React.useRef(false)
  const fieldCount = bulk.fields.length

  React.useEffect(() => {
    if (!focusLast.current) return
    focusLast.current = false
    lastPicker.current?.focus()
  }, [fieldCount])

  return (
    <DialogTrigger isOpen={bulk.open} onOpenChange={bulk.onOpenChange}>
      <Button variant="ghost" size="sm">
        <PencilIcon />
        {messages.bulkEdit.open}
      </Button>
      <Dialog className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{messages.bulkEdit.title}</DialogTitle>
          <DialogDescription>
            {messages.bulkEdit.description(bulk.rowCount)}
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-3">
          {bulk.fields.map((field, index) => (
            <DataTableBulkEditField
              key={field.key}
              bulk={bulk}
              field={field}
              editors={editors}
              messages={messages}
              pickerRef={index === fieldCount - 1 ? lastPicker : undefined}
            />
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          isDisabled={bulk.pending || fieldCount >= bulk.columns.length}
          onPress={() => {
            focusLast.current = true
            bulk.addField()
          }}
        >
          <PlusIcon />
          {messages.bulkEdit.addField}
        </Button>
        {bulk.error && (
          <p role="alert" className="text-sm text-destructive">
            {bulk.error}
          </p>
        )}
        <DialogFooter>
          <DialogClose isDisabled={bulk.pending}>
            {messages.bulkEdit.cancel}
          </DialogClose>
          <Button
            isPending={bulk.pending}
            isDisabled={!bulk.pending && !bulk.canApply}
            onPress={() => void bulk.apply()}
          >
            {bulk.pending && <Loader2Icon className="animate-spin" />}
            {bulk.pending
              ? messages.bulkEdit.applying
              : messages.bulkEdit.apply(bulk.rowCount)}
          </Button>
        </DialogFooter>
      </Dialog>
    </DialogTrigger>
  )
}

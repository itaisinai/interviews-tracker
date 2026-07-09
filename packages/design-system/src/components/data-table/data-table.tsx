import { type ColumnDef, flexRender, getCoreRowModel, type Table, useReactTable } from "@tanstack/react-table";
import type { HTMLAttributes, ReactNode } from "react";

type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  emptyState?: ReactNode;
  className?: string;
  tableClassName?: string;
  getRowProps?: (row: TData) => HTMLAttributes<HTMLTableRowElement>;
};

export function DataTable<TData>({
  data,
  columns,
  emptyState,
  className,
  tableClassName,
  getRowProps,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={className}>
      <table className={tableClassName ?? "w-full border-collapse text-left text-body-md"}>
        <TableHead table={table} />
        <TableBody table={table} emptyState={emptyState} getRowProps={getRowProps} />
      </table>
    </div>
  );
}

function TableHead<TData>({ table }: { table: Table<TData> }) {
  return (
    <thead className="border-b border-outline-variant bg-surface-container-lowest font-label-md text-label-md uppercase text-on-surface-variant">
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <th
              key={header.id}
              className="overflow-hidden border-r border-outline-variant/40 px-6 py-5 text-left font-label-md text-label-md uppercase tracking-wider text-on-surface-variant last:border-r-0"
              style={{ width: header.getSize() }}
            >
              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  );
}

function TableBody<TData>({
  table,
  emptyState,
  getRowProps,
}: {
  table: Table<TData>;
  emptyState?: ReactNode;
  getRowProps?: (row: TData) => HTMLAttributes<HTMLTableRowElement>;
}) {
  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    return (
      <tbody>
        <tr>
          <td className="px-8 py-10 text-body-md text-on-surface-variant" colSpan={table.getAllLeafColumns().length}>
            {emptyState ?? "No rows found."}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="divide-y divide-outline-variant">
      {rows.map((row) => (
        <tr
          key={row.id}
          className="h-16 bg-surface-container-lowest transition-colors hover:bg-surface-container-low/80"
          {...(getRowProps?.(row.original) ?? {})}
        >
          {row.getVisibleCells().map((cell) => (
            <td
              key={cell.id}
              className="max-w-0 overflow-hidden border-r border-outline-variant/25 px-6 py-5 align-middle last:border-r-0"
              style={{ width: cell.column.getSize() }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

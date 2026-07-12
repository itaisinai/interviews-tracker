# DataTable Component

A flexible table component built on top of TanStack Table with support for column resizing.

## Features

- **Column Resizing**: Users can drag column borders to resize columns
- **Responsive**: Works on both desktop and touch devices
- **Customizable**: Configure resize behavior and disable if needed
- **Type-safe**: Full TypeScript support

## Usage

### Basic Example

```tsx
import { DataTable } from '@interviews-tracker/design-system';
import type { ColumnDef } from '@tanstack/react-table';

type Person = {
  name: string;
  email: string;
  role: string;
};

const columns: ColumnDef<Person>[] = [
  { 
    header: 'Name', 
    accessorKey: 'name',
    size: 200, // Initial size in pixels
  },
  { 
    header: 'Email', 
    accessorKey: 'email',
    size: 250,
  },
  { 
    header: 'Role', 
    accessorKey: 'role',
    size: 150,
  },
];

const data: Person[] = [
  { name: 'John Doe', email: 'john@example.com', role: 'Engineer' },
  { name: 'Jane Smith', email: 'jane@example.com', role: 'Designer' },
];

function MyTable() {
  return (
    <DataTable 
      data={data} 
      columns={columns}
      className="rounded-xl border border-outline-variant"
    />
  );
}
```

### Column Resizing

Column resizing is **enabled by default**. Users can:

1. Hover over the right edge of any column header
2. Click and drag to resize the column
3. The resize handle appears on hover with a visual indicator

#### Resize Modes

- `onChange` (default): Column width updates in real-time as you drag
- `onEnd`: Column width updates only when you release the mouse

```tsx
<DataTable 
  data={data} 
  columns={columns}
  columnResizeMode="onEnd" // Wait until drag ends to update
/>
```

#### Disable Resizing

To disable column resizing entirely:

```tsx
<DataTable 
  data={data} 
  columns={columns}
  enableColumnResizing={false}
/>
```

### Setting Initial Column Sizes

Set the `size` property in your column definition:

```tsx
const columns: ColumnDef<Person>[] = [
  { 
    header: 'Name', 
    accessorKey: 'name',
    size: 200, // Width in pixels
  },
  { 
    header: 'Email', 
    accessorKey: 'email',
    size: 300, // Wider column
  },
];
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `TData[]` | required | Array of data objects to display |
| `columns` | `ColumnDef<TData>[]` | required | Column definitions |
| `emptyState` | `ReactNode` | "No rows found." | Content to show when table is empty |
| `className` | `string` | - | CSS class for wrapper div |
| `tableClassName` | `string` | - | CSS class for table element |
| `getRowProps` | `(row: TData) => HTMLAttributes<HTMLTableRowElement>` | - | Function to get additional props for rows |
| `enableColumnResizing` | `boolean` | `true` | Enable/disable column resizing |
| `columnResizeMode` | `"onChange" \| "onEnd"` | `"onChange"` | When to update column widths |

## Implementation Details

The resize functionality:

- Uses TanStack Table's built-in column resizing features
- Adds an 8px wide invisible drag handle on the right edge of each header
- Shows a visual indicator on hover (primary color with 30% opacity)
- Shows a stronger indicator while dragging (primary color with 50% opacity)
- Works with mouse and touch events
- Cursor changes to `col-resize` when hovering over the handle

## Examples in the Codebase

See these pages for real-world usage:

- `apps/web/src/pages/opportunities-page.tsx` - Opportunities table with sorting and filtering
- `apps/web/src/pages/companies-page.tsx` - Companies table

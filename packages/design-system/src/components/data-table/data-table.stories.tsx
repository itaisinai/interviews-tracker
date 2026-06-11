import type { Meta, StoryObj } from "@storybook/react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";

type Row = { company: string; role: string; status: string };

const columns: ColumnDef<Row, unknown>[] = [
  { header: "Company", accessorKey: "company" },
  { header: "Role", accessorKey: "role" },
  { header: "Status", accessorKey: "status" },
];

const data: Row[] = [
  { company: "Unframe", role: "Software Engineer", status: "In process" },
  { company: "Notch", role: "Full Stack Developer", status: "Waiting" },
];

function DemoTable() {
  return (
    <DataTable
      data={data}
      columns={columns}
      emptyState="No rows"
      className="overflow-hidden rounded-xl border border-outline-variant"
    />
  );
}

const meta = {
  title: "UI/DataTable",
  component: DemoTable,
} satisfies Meta<typeof DemoTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from "@storybook/react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "./data-table";

type Row = { company: string; role: string; status: string };

const columns: ColumnDef<Row, unknown>[] = [
  { header: "Company", accessorKey: "company", size: 200 },
  { header: "Role", accessorKey: "role", size: 250 },
  { header: "Status", accessorKey: "status", size: 150 },
];

const data: Row[] = [
  { company: "Unframe", role: "Software Engineer", status: "In process" },
  { company: "Notch", role: "Full Stack Developer", status: "Waiting" },
  { company: "Acme Corp", role: "Senior Frontend Engineer", status: "Applied" },
  { company: "Tech Innovations", role: "Product Designer", status: "Interviewing" },
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

function DemoTableWithoutResize() {
  return (
    <DataTable
      data={data}
      columns={columns}
      emptyState="No rows"
      className="overflow-hidden rounded-xl border border-outline-variant"
      enableColumnResizing={false}
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

export const WithoutResize: Story = {
  render: () => <DemoTableWithoutResize />,
};

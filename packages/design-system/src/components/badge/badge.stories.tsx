import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  args: {
    children: "Label",
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};
export const Active: Story = { args: { children: "Active", tone: "active" } };
export const Warning: Story = { args: { children: "Warning", tone: "warning" } };
export const Danger: Story = { args: { children: "Danger", tone: "red" } };

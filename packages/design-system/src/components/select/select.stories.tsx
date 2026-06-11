import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "./select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  render: (args) => (
    <Select {...args}>
      <option>First</option>
      <option>Second</option>
      <option>Third</option>
    </Select>
  ),
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {};

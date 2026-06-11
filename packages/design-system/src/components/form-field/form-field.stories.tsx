import type { Meta, StoryObj } from "@storybook/react";
import { FormField } from "./form-field";
import { Input } from "../input";

const meta: Meta<typeof FormField> = {
  title: "UI/FormField",
  component: FormField,
  render: (args) => (
    <FormField {...args}>
      <Input placeholder="Value" />
    </FormField>
  ),
  args: {
    label: "Field label",
    hint: "Optional helper text",
  },
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {};
export const Error: Story = { args: { error: "Required field" } };

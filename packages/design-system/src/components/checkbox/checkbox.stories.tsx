import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Checkbox } from "./checkbox";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Accept terms and conditions",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Show All",
    description: "Include hidden and previously used emails",
  },
};

export const Checked: Story = {
  args: {
    label: "Enabled feature",
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled option",
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: "Disabled checked",
    checked: true,
    disabled: true,
  },
};

export const WithError: Story = {
  args: {
    label: "Required field",
    error: "This field is required",
  },
};

export const Indeterminate: Story = {
  args: {
    label: "Partially selected",
    indeterminate: true,
  },
};

export const WithoutLabel: Story = {
  args: {},
  render: (args) => <Checkbox {...args} aria-label="Checkbox without visible label" />,
};

export const Interactive: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Checkbox label="Toggle me" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "var(--md-sys-color-on-surface-variant)" }}>
          Current state: {checked ? "Checked" : "Unchecked"}
        </p>
      </div>
    );
  },
};

export const MultipleOptions: Story = {
  render: () => {
    const [options, setOptions] = useState({
      email: true,
      sms: false,
      push: true,
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h3 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>Notification Preferences</h3>
        <Checkbox
          label="Email notifications"
          description="Receive updates via email"
          checked={options.email}
          onChange={(e) => setOptions({ ...options, email: e.target.checked })}
        />
        <Checkbox
          label="SMS notifications"
          description="Receive updates via text message"
          checked={options.sms}
          onChange={(e) => setOptions({ ...options, sms: e.target.checked })}
        />
        <Checkbox
          label="Push notifications"
          description="Receive updates on your device"
          checked={options.push}
          onChange={(e) => setOptions({ ...options, push: e.target.checked })}
        />
      </div>
    );
  },
};

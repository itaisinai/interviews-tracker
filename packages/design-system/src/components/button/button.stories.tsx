import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  args: {
    children: "Button",
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Danger: Story = { args: { variant: "danger" } };
export const Loading: Story = { args: { loading: true, loadingLabel: "Saving..." } };
export const WithIcon: Story = { args: { leadingIcon: "add", children: "Add item" } };

export const InteractiveLoading: Story = {
  args: {
    variant: "primary",
    loadingLabel: "Processing...",
  },
  render: (args) => {
    const [loading, setLoading] = useState(false);

    const handleClick = () => {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 5000);
    };

    return (
      <Button
        variant={args.variant}
        size={args.size}
        loadingLabel={args.loadingLabel || "Processing..."}
        loading={loading}
        onClick={handleClick}
      >
        Click to Load
      </Button>
    );
  },
};

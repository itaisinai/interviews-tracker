import type { Meta, StoryObj } from "@storybook/react";
import { IconButton } from "./icon-button";

const meta: Meta<typeof IconButton> = {
  title: "UI/IconButton",
  component: IconButton,
  args: {
    icon: "more_vert",
    label: "More actions",
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {};
export const Filled: Story = { args: { iconFilled: true } };

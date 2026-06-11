import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./textarea";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
  args: {
    placeholder: "Write notes",
    rows: 4,
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};

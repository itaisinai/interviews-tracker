import type { Meta, StoryObj } from "@storybook/react";

import { Card } from "./card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  render: (args) => (
    <Card {...args}>
      <div className="p-6">
        <h3 className="font-title-md text-title-md font-bold">Card title</h3>
        <p className="mt-2 text-body-md text-on-surface-variant">Compact surface container for grouped content.</p>
      </div>
    </Card>
  ),
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {};

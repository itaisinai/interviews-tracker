import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Drawer } from "./drawer";
import { Button } from "../button";

const meta: Meta<typeof Drawer> = {
  title: "UI/Drawer",
  component: Drawer,
};

export default meta;
type Story = StoryObj<typeof Drawer>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);

    return (
      <div className="min-h-[400px]">
        <Button onClick={() => setOpen(true)}>Open drawer</Button>
        <Drawer
          open={open}
          title="Drawer title"
          description="Reusable side panel"
          onClose={() => setOpen(false)}
        >
          <p className="text-body-md text-on-surface-variant">
            Drawer content goes here.
          </p>
        </Drawer>
      </div>
    );
  },
};

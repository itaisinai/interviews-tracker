import type { Meta, StoryObj } from "@storybook/react";

import { Calendar } from "./calendar";

const nextMonth = new Date(2026, 6, 1);

const meta: Meta<typeof Calendar> = {
  title: "UI/Calendar",
  component: Calendar,
  args: {
    eyebrow: "Next month",
    month: nextMonth,
    events: [
      { id: "1", date: new Date(2026, 6, 8, 10, 0), title: "Alta · Interview · Rotem", time: "10:00" },
      { id: "2", date: new Date(2026, 6, 14, 9, 30), title: "Celery · Phone Call · Nofar", time: "09:30" },
      { id: "3", date: new Date(2026, 6, 14, 15, 0), title: "Luma · Technical Interview · Dana", time: "15:00" },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof Calendar>;

export const Default: Story = {};

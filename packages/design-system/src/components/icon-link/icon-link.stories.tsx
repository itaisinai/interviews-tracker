import type { Meta, StoryObj } from "@storybook/react";

import { IconLink } from "./icon-link";

const meta = {
  title: "Components/IconLink",
  component: IconLink,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof IconLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    href: "/opportunities/some-slug",
    children: "View Opportunity",
  },
};

export const CustomIcon: Story = {
  args: {
    href: "/edit",
    icon: "edit",
    children: "Edit Details",
  },
};

export const ExternalLink: Story = {
  args: {
    href: "https://example.com",
    icon: "link",
    children: "Visit Website",
    target: "_blank",
    rel: "noopener noreferrer",
  },
};

export const InConstrainedWidth: Story = {
  args: {
    href: "/opportunities/some-slug",
    children: "View Opportunity",
  },
  render: (args) => (
    <div className="w-32 border border-outline-variant p-2">
      <p className="text-body-sm mb-2">This link won't wrap:</p>
      <IconLink {...args} />
    </div>
  ),
};

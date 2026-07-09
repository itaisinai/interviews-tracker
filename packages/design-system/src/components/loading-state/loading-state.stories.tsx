import type { Meta, StoryObj } from "@storybook/react";

import { InlineLoadingState, PageErrorState, PageLoadingState, ProcessStateCard } from "./loading-state";

const meta: Meta = {
  title: "UI/LoadingState",
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  render: () => <InlineLoadingState label="Refreshing" />,
};

export const PageLoading: Story = {
  render: () => (
    <PageLoadingState title="Opportunity" description="Loading opportunity details, notes, and interaction history." />
  ),
};

export const PageError: Story = {
  render: () => (
    <PageErrorState title="Opportunity" description="Unable to load opportunity." onRetry={() => undefined} />
  ),
};

export const Process: Story = {
  render: () => (
    <ProcessStateCard
      title="Parsing"
      message="Extracting structured fields"
      description="The AI is reading the job description."
      tone="busy"
      progress={64}
    />
  ),
};

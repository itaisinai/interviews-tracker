import type { Meta, StoryObj } from "@storybook/react";
import { JobHistoryTimeline } from "./job-history-timeline";

const meta = {
  title: "Components/JobHistoryTimeline",
  component: JobHistoryTimeline,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof JobHistoryTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleCompanyMultiplePositions: Story = {
  args: {
    companies: [
      {
        companyName: "Google",
        totalDuration: "7 yrs 6 mos",
        positions: [
          {
            title: "Senior Staff Software Engineer",
            employmentType: "Full-time",
            startDate: "May 2024",
            endDate: "Present",
            duration: "2 yrs 2 mos",
            location: "San Jose, California, United States · On-site",
          },
          {
            title: "Staff Software Engineer",
            employmentType: "Full-time",
            startDate: "May 2022",
            endDate: "May 2024",
            duration: "2 yrs 1 mo",
            location: "Mountain View, California, United States",
          },
          {
            title: "Senior Software Engineer",
            employmentType: "Full-time",
            startDate: "Jun 2020",
            endDate: "May 2022",
            duration: "2 yrs",
            location: "Mountain View, California, United States",
          },
          {
            title: "Senior Software Engineer",
            employmentType: "Full-time",
            startDate: "Jan 2019",
            endDate: "Jun 2020",
            duration: "1 yr 6 mos",
            location: "Tel Aviv - Jaffa, Tel Aviv District, Israel",
          },
        ],
      },
    ],
  },
};

export const MultipleCompanies: Story = {
  args: {
    companies: [
      {
        companyName: "Car Connectivity Consortium (CCC)",
        totalDuration: "4 yrs",
        positions: [
          {
            title: "Chair, Light Motor and Mobility Task Group (LMTG)",
            startDate: "Mar 2026",
            endDate: "Present",
            duration: "4 mos",
            description:
              "Lead the dedicated task group focused on defining and standardizing digital key solutions tailored to the specific use cases, hardware constraints, and market needs of light motor and mobility vehicles.",
          },
          {
            title: "Member, Board Of Directors",
            startDate: "Jul 2022",
            endDate: "Present",
            duration: "4 yrs",
          },
        ],
      },
      {
        companyName: "Google",
        totalDuration: "7 yrs 6 mos",
        positions: [
          {
            title: "Senior Staff Software Engineer",
            employmentType: "Full-time",
            startDate: "May 2024",
            endDate: "Present",
            duration: "2 yrs 2 mos",
            location: "San Jose, California, United States · On-site",
          },
          {
            title: "Staff Software Engineer",
            employmentType: "Full-time",
            startDate: "May 2022",
            endDate: "May 2024",
            duration: "2 yrs 1 mo",
            location: "Mountain View, California, United States",
          },
        ],
      },
      {
        companyName: "Intel Corporation",
        totalDuration: "11 yrs 11 mos",
        positions: [
          {
            title: "Software Architect",
            startDate: "Jul 2012",
            endDate: "Jan 2019",
            duration: "6 yrs 7 mos",
            location: "Santa Clara, California, US",
            description: "@ Wireless Connectivity Solutions WiFi Core Development",
          },
        ],
      },
    ],
  },
};

export const SinglePosition: Story = {
  args: {
    companies: [
      {
        companyName: "Masterschool",
        totalDuration: "7 yrs 4 mos",
        positions: [
          {
            title: "Co-Founder",
            startDate: "Jan 2018",
            endDate: "Apr 2025",
            duration: "7 yrs 4 mos",
            description:
              "At Masterschool, we are on a mission to ensure everyone can build inspiring careers. We are a global network of career-training schools, led by industry experts, and driven by the success of our students.",
          },
        ],
      },
    ],
  },
};

export const WithCompanyUrl: Story = {
  args: {
    companies: [
      {
        companyName: "Google",
        companyUrl: "https://www.google.com",
        totalDuration: "7 yrs 6 mos",
        positions: [
          {
            title: "Senior Staff Software Engineer",
            employmentType: "Full-time",
            startDate: "May 2024",
            endDate: "Present",
            duration: "2 yrs 2 mos",
            location: "San Jose, California, United States · On-site",
          },
        ],
      },
    ],
  },
};

export const MinimalData: Story = {
  args: {
    companies: [
      {
        companyName: "Startup Inc",
        totalDuration: "1 yr",
        positions: [
          {
            title: "Software Engineer",
            startDate: "Jan 2024",
            endDate: "Present",
            duration: "1 yr",
          },
        ],
      },
    ],
  },
};

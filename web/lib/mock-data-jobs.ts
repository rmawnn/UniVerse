/**
 * Mock data for the Jobs / internships board. Shapes mirror what the
 * FastAPI `/jobs` endpoints will return; swap for React Query later.
 */

export type JobType = "Internship" | "Part-time" | "Remote" | "Campus";

export interface Job {
  id: string;
  title: string;
  org: string;
  /** Whether the poster is a company or an on-campus department. */
  orgKind: "company" | "university";
  location: string;
  types: JobType[];
  pay: string;
  posted: string;
  /** Logo gradient + glyph, same visual language as CommunityIcon. */
  hue: [string, string];
  glyph: string;
  blurb: string;
  description: string[];
  requirements: string[];
  applicants: number;
  saved?: boolean;
}

export const JOBS: Job[] = [
  {
    id: "ml-research-intern",
    title: "ML Research Intern",
    org: "Anthropic",
    orgKind: "company",
    location: "San Francisco, CA",
    types: ["Internship", "Remote"],
    pay: "$9,500 / mo",
    posted: "2h",
    hue: ["#9B6CFF", "#5C8FFF"],
    glyph: "✳",
    blurb:
      "Work alongside the interpretability team on frontier model research. Open to PhD and strong MS students.",
    description: [
      "Join our research team for a 12-week summer internship focused on mechanistic interpretability and model evaluation.",
      "You’ll own a research question end-to-end: from literature review and experiment design through to a write-up that ships internally.",
      "Interns are paired with a mentor and embedded in a pod of 4–6 researchers.",
    ],
    requirements: [
      "Currently enrolled in a CS, ML, or related graduate program",
      "Strong PyTorch or JAX experience",
      "A paper, project, or open-source contribution you’re proud of",
      "Comfortable reading and reproducing recent ML papers",
    ],
    applicants: 248,
  },
  {
    id: "cs229-section-leader",
    title: "CS 229 Section Leader",
    org: "Stanford CS Department",
    orgKind: "university",
    location: "On campus · Gates",
    types: ["Part-time", "Campus"],
    pay: "$28 / hr",
    posted: "5h",
    hue: ["#5AE0B6", "#34A8FF"],
    glyph: "🧠",
    blurb:
      "Lead a weekly discussion section for Machine Learning. Great fit for students who aced 229.",
    description: [
      "Run one 50-minute section per week, hold 2 office hours, and grade problem sets for a group of ~20 students.",
      "Section leaders meet weekly with course staff to align on material and review common misconceptions.",
    ],
    requirements: [
      "Earned an A in CS 229",
      "Available Tue/Thu afternoons",
      "Strong communication skills",
    ],
    applicants: 36,
  },
  {
    id: "frontend-eng-intern",
    title: "Frontend Engineering Intern",
    org: "Linear",
    orgKind: "company",
    location: "Remote (US)",
    types: ["Internship", "Remote"],
    pay: "$8,000 / mo",
    posted: "1d",
    hue: ["#C7A0FF", "#7CC7FF"],
    glyph: "▲",
    blurb:
      "Ship real features to a product used by thousands of teams. React, TypeScript, and a very high bar for craft.",
    description: [
      "You’ll work on the web app with a small, senior team — no busywork, real ownership from week one.",
      "Expect to merge to production in your first two weeks.",
    ],
    requirements: [
      "Fluent in React + TypeScript",
      "An eye for interaction detail and motion",
      "Portfolio or side projects that show craft",
    ],
    applicants: 412,
  },
  {
    id: "campus-ambassador",
    title: "Campus Ambassador",
    org: "Notion",
    orgKind: "company",
    location: "On campus",
    types: ["Part-time", "Campus"],
    pay: "$22 / hr + perks",
    posted: "2d",
    hue: ["#FFB547", "#FF6A6A"],
    glyph: "◇",
    blurb:
      "Run workshops, grow the student community, and get early access to new features.",
    description: [
      "Host 2 events per month, manage a student Slack, and report on engagement.",
      "Flexible ~6 hrs/week. Build your network and your resume.",
    ],
    requirements: [
      "Outgoing and organized",
      "Active in at least one campus club",
      "Comfortable speaking to groups",
    ],
    applicants: 88,
  },
  {
    id: "research-assistant-hci",
    title: "Research Assistant · HCI Lab",
    org: "Stanford HCI Group",
    orgKind: "university",
    location: "On campus · Gates 3A",
    types: ["Part-time", "Campus"],
    pay: "$25 / hr",
    posted: "3d",
    hue: ["#FF8DA1", "#FF6FB1"],
    glyph: "🎨",
    blurb:
      "Support a study on collaborative interfaces. Run participants, analyze data, co-author a paper.",
    description: [
      "Assist with participant recruiting, study sessions, and qualitative coding.",
      "Strong RAs are invited to co-author the resulting CHI submission.",
    ],
    requirements: [
      "Coursework in HCI or design",
      "Detail-oriented with qualitative data",
      "10–15 hrs/week through the quarter",
    ],
    applicants: 19,
  },
];

export const RECOMMENDED_JOBS = JOBS.slice(0, 3);

import type { Metadata } from "next";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const res = await fetch(`${API}/jobs/${params.id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error("not found");
    const job = await res.json();
    const title = job.company_name
      ? `${job.title} at ${job.company_name}`
      : job.title;
    return {
      title: `${title} | UniVerse Jobs`,
      description: `${title}${job.location ? ` — ${job.location}` : ""}. Apply on UniVerse.`,
      openGraph: {
        title,
        description: `${job.job_type} position${job.location ? ` in ${job.location}` : ""}. Apply on UniVerse.`,
      },
    };
  } catch {
    return { title: "Job | UniVerse" };
  }
}

export default function JobLayout({ children }: { children: React.ReactNode }) {
  return children;
}

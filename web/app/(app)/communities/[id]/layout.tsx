import type { Metadata } from "next";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const res = await fetch(`${API}/communities/${params.id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error("not found");
    const community = await res.json();
    return {
      title: `${community.name} | UniVerse`,
      description: community.description || `${community.name} community on UniVerse.`,
      openGraph: {
        title: community.name,
        description: community.description || `Join ${community.name} on UniVerse.`,
      },
    };
  } catch {
    return { title: "Community | UniVerse" };
  }
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}

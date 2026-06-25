import type { Metadata } from "next";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  try {
    const res = await fetch(`${API}/users/by-username/${encodeURIComponent(params.username)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error("not found");
    const user = await res.json();
    return {
      title: `${user.full_name} (@${user.username}) | UniVerse`,
      description: user.bio || `${user.full_name}'s profile on UniVerse — the social network for verified university students.`,
      openGraph: {
        title: `${user.full_name} (@${user.username})`,
        description: user.bio || `Check out ${user.full_name}'s profile on UniVerse.`,
        images: user.profile_image_url ? [user.profile_image_url] : [],
      },
    };
  } catch {
    return { title: `@${params.username} | UniVerse` };
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

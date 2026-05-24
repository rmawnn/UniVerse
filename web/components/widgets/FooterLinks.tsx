import Link from "next/link";

const FOOTER_LINKS = [
  "About",
  "Terms",
  "Privacy",
  "Cookies",
  "Accessibility",
  "Verification",
  "Help",
  "Status",
];

export function FooterLinks() {
  return (
    <footer className="mt-6 px-1 text-[11px] leading-[1.7] text-fg-4">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {FOOTER_LINKS.map((t) => (
          <Link key={t} href="#" className="hover:text-fg-2">
            {t}
          </Link>
        ))}
      </div>
      <div className="mt-2 font-mono tracking-[0.05em]">
        UniVerse · v2.4.1
      </div>
    </footer>
  );
}

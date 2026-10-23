"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFest } from "./FestProvider";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/ask", label: "Ask Festro" },
];

export function Nav() {
  const pathname = usePathname();
  const { favs, announcements } = useFest();

  return (
    <>
      <div className="wrap nav">
        <Link href="/" className="brand" aria-label="Festro home">
          <Logo />
          Festro
        </Link>
        <nav className="links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? "on" : undefined}>
              {l.label}
            </Link>
          ))}
          <Link href="/events?view=saved" className="btn2 btn-sm" title="View your bookmarked events">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Saved ({favs.size})
          </Link>
        </nav>
      </div>
      <div className="banner">
        <div className="wrap">
          <b>Announcement:</b> {announcements[0]?.message ?? "Loading…"}
        </div>
      </div>
    </>
  );
}

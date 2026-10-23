import Link from "next/link";
import { FEST_NAME, HELPDESK } from "@/lib/fest";

export function Footer() {
  return (
    <footer>
      <div className="wrap footer-row">
        <div>
          <span className="footer-brand">Festro</span>
          <div>Built for {FEST_NAME} · Live Assistant</div>
        </div>
        <div>
          <div>Helpdesk: {HELPDESK}</div>
          <Link href="/organizer" className="footer-link">
            Organizer login
          </Link>
        </div>
      </div>
    </footer>
  );
}

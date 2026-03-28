import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

const links = [
  { href: "/app", label: "Overview" },
  { href: "/app/access", label: "Access" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/review", label: "Review" },
  { href: "/history", label: "History" }
];

export function AppNav() {
  return (
    <nav className="app-nav">
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
      <UserButton />
    </nav>
  );
}

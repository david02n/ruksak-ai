import Link from "next/link";

import { LogoMark } from "@/components/logo-mark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <LogoMark priority size={42} />
        <div>
          <span>Ruksak.ai</span>
          <small>Portable context for AI-native work</small>
        </div>
      </Link>

      <nav className="nav">
        <a href="#product">Product</a>
        <a href="#launch">Launch</a>
        <a href="#stack">Stack</a>
      </nav>
    </header>
  );
}

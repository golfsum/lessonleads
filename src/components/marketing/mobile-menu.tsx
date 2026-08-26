"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const links = [
  ["How it works", "/how-it-works"],
  ["Features", "/features"],
  ["Pricing", "/pricing"],
  ["Resources", "/resources"],
  ["Try the demo", "/demo"],
] as const;

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-menu">
      <button aria-expanded={open} aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((value) => !value)} type="button">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open ? (
        <div className="mobile-menu-panel">
          <nav aria-label="Mobile navigation">
            {links.map(([label, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>)}
          </nav>
          <div>
            <Link className="button button-secondary" href="/login" onClick={() => setOpen(false)}>Log in</Link>
            <Link className="button button-primary" href="/signup" onClick={() => setOpen(false)}>Build your widget</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

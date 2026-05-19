"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="nav-shell">
      <button
        type="button"
        className={`nav-trigger ${open ? "is-open" : ""}`.trim()}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle navigation"
        aria-expanded={open}
      >
        <span className="nav-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      <div className={`nav-panel ${open ? "is-open" : ""}`.trim()}>
        <nav className="nav-links">
          <Link href="/" onClick={() => setOpen(false)}>
            Home
          </Link>
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            Generate Email
          </Link>
        </nav>
      </div>
      <div
        className={`nav-backdrop ${open ? "is-open" : ""}`.trim()}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
    </div>
  );
}

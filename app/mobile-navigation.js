"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "./i18n-context";

function Icon({ name }) {
  const paths = {
    home: "M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z",
    history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    profile: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  };

  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name]} />
    </svg>
  );
}

export default function MobileNavigation() {
  const pathname = usePathname();
  const { t } = useLang();

  const items = [
    { href: "/", label: t.home, icon: "home" },
    { href: "/history", label: t.history, icon: "history" },
    { href: "/profile", label: t.profile, icon: "profile" },
  ];

  return (
    <nav className="bottom-nav mobile-only" aria-label="التنقل الرئيسي">
      {items.slice(0, 2).map((item) => (
        <Link key={item.href} href={item.href} className={`bottom-nav-item${pathname === item.href ? " active" : ""}`}>
          <span className="nav-icon-wrap"><Icon name={item.icon} /></span>
          <span>{item.label}</span>
        </Link>
      ))}
      <Link href="/" className="bottom-nav-item nav-add" aria-label={t.addMeal}>
        <span className="nav-icon-wrap">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
        <span>{t.addMeal}</span>
      </Link>
      {items.slice(2).map((item) => (
        <Link key={item.href} href={item.href} className={`bottom-nav-item${pathname === item.href ? " active" : ""}`}>
          <span className="nav-icon-wrap"><Icon name={item.icon} /></span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

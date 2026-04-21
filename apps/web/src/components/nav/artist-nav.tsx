"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const links = [
  { href: "/dashboard", label: "Главная" },
  { href: "/releases", label: "Релизы" },
];

export function ArtistNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <span className="font-semibold tracking-tight">MeatRecords</span>
        <Separator orientation="vertical" className="h-5" />
        <nav className="flex gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                pathname === l.href ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void signOut({ redirectTo: "/login" })}
          >
            Выйти
          </Button>
        </div>
      </div>
    </header>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/material-icons";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Logo } from "./logo";
const links = [
  { label: "Home", href: "/#top" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Examples", href: "/#examples" },
  { label: "FAQs", href: "/#questions" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
export function NavigationSheet() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const close = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, []);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-[min(360px,90vw)] flex-col overflow-y-auto">
        <SheetTitle className="sr-only">HireDraft navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Explore HireDraft or open your application workspace.
        </SheetDescription>
        <div
          className="mr-6"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <Logo />
        </div>
        <nav
          aria-label="Mobile navigation"
          className="mt-8 flex flex-col gap-1"
        >
          {links.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link
                className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                href={link.href}
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto border-t pt-6">
          <SheetClose asChild>
            <Button asChild className="w-full">
              <Link href="/analyze-job">Open workspace</Link>
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

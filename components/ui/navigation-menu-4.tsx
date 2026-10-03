"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Info, LifeBuoy, Menu, X } from "@/components/ui/material-icons";
import Brand from "@/components/brand";
import ThemeToggle from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const features = [
  {
    href: "/#how-it-works",
    label: "How it works",
    description: "From a job opportunity to a personal introduction.",
  },
  {
    href: "/#examples",
    label: "Examples",
    description: "See how your experience shapes an application email.",
  },
  {
    href: "/analyze-job",
    label: "Application workspace",
    description: "Add a job, review your resume, and write your draft.",
  },
];
const resources = [
  { href: "/#questions", label: "FAQs", icon: BookOpen },
  { href: "/contact", label: "Contact", icon: LifeBuoy },
  { href: "/about", label: "About HireDraft", icon: Info },
];
export default function NavigationMenu4() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
      <div className="page-width flex h-[72px] items-center justify-between gap-3">
        <div className="flex items-center gap-2 lg:gap-8">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                aria-label={open ? "Close navigation" : "Open navigation"}
              >
                {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={16}
              collisionPadding={16}
              className="max-h-[var(--radix-popover-content-available-height)] w-72 max-w-[calc(100vw-32px)] overflow-y-auto p-2 md:hidden"
              aria-label="Site menu"
            >
              <nav
                aria-label="Mobile navigation"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a"))
                    setOpen(false);
                }}
              >
                <Link
                  href="/"
                  className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  Home
                </Link>
                {[
                  { label: "Features", items: features },
                  { label: "Resources", items: resources },
                ].map((group) => (
                  <div key={group.label} className="mt-2 border-t pt-2">
                    <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
                      {group.label}
                    </p>
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block rounded-md px-3 py-2.5 text-sm hover:bg-accent"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ))}
                <Button asChild className="mt-3 w-full">
                  <Link href="/analyze-job">
                    Open workspace <ArrowRight />
                  </Link>
                </Button>
              </nav>
            </PopoverContent>
          </Popover>
          <Brand />
          <NavigationMenu
            aria-label="Main navigation"
            className="hidden md:flex"
          >
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/" className={navigationMenuTriggerStyle()}>
                    Home
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[360px] gap-1 p-2">
                    {features.map((item) => (
                      <li key={item.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={item.href}
                            className="block rounded-md p-3 outline-none hover:bg-accent focus-visible:bg-accent"
                          >
                            <span className="text-sm font-medium">
                              {item.label}
                            </span>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                              {item.description}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[280px] gap-1 p-2">
                    {resources.map(({ href, label, icon: Icon }) => (
                      <li key={href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={href}
                            className="flex items-center gap-3 rounded-md p-3 text-sm font-medium outline-none hover:bg-accent focus-visible:bg-accent"
                          >
                            <Icon
                              className="size-4 text-muted-foreground"
                              aria-hidden="true"
                            />
                            {label}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/analyze-job">
              Open workspace <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

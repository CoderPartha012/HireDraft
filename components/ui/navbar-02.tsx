"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Logo } from "@/components/ui/navbar-02-utils/logo";
import { NavigationSheet } from "@/components/ui/navbar-02-utils/navigation-sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export const navigationLinks = [
  { label: "Home", href: "/#top" },
  { label: "Examples", href: "/#examples" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
export function NavMenu() {
  const pathname = usePathname();
  return (
    <NavigationMenu aria-label="Main navigation" className="hidden lg:flex">
      <NavigationMenuList>
        {navigationLinks.map((link) => (
          <NavigationMenuItem key={link.href}>
            <NavigationMenuLink
              asChild
              active={!link.href.includes("#") && pathname === link.href}
            >
              <Link
                href={link.href}
                className={cn(
                  navigationMenuTriggerStyle(),
                  "px-3 text-muted-foreground hover:text-foreground data-[active]:text-foreground",
                )}
              >
                {link.label}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur-sm">
      <div className="page-width flex h-full items-center justify-between gap-3">
        <div className="flex items-center gap-8 xl:gap-12">
          <Logo />
          <NavMenu />
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button asChild variant="outline" className="hidden xl:inline-flex">
            <Link href="/#how-it-works">How it works</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/analyze-job">Open workspace</Link>
          </Button>
          <ThemeToggle variant="icon" />
          <NavigationSheet />
        </div>
      </div>
    </header>
  );
}

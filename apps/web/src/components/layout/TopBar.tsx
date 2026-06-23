import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/lib/theme";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function useBreadcrumbs() {
  const location = useLocation();
  const path = location.pathname;

  if (path === "/") {
    return [{ label: "Dashboard" }];
  }

  if (path === "/search") {
    return [{ label: "Dashboard", href: "/" }, { label: "Search" }];
  }

  if (path === "/map") {
    return [{ label: "Dashboard", href: "/" }, { label: "Map" }];
  }

  if (path === "/operators" || path.startsWith("/operators?")) {
    return [{ label: "Dashboard", href: "/" }, { label: "Operators" }];
  }

  if (path === "/about") {
    return [{ label: "Dashboard", href: "/" }, { label: "About" }];
  }

  const wellMatch = path.match(/^\/wells\/(\d+)/);
  if (wellMatch) {
    return [
      { label: "Dashboard", href: "/" },
      { label: "Search", href: "/search" },
      { label: `Well ${wellMatch[1]}` },
    ];
  }

  return [{ label: "Dashboard", href: "/" }];
}

function WaLookup() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const waNum = Number.parseInt(value.trim(), 10);
    if (!Number.isNaN(waNum)) {
      navigate(`/wells/${waNum}`);
      setValue("");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 items-center gap-1 sm:flex-none">
      <Input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Go to WA #"
        aria-label="Jump to well authorization number"
        className="h-10 w-full bg-muted/50 text-sm sm:h-8 sm:w-36"
      />
      <button
        type="submit"
        aria-label="Go to well"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-8 sm:w-8"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-8 sm:w-8"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function TopBar() {
  const crumbs = useBreadcrumbs();

  return (
    <header className="flex min-h-12 shrink-0 flex-col gap-2 border-b border-border/50 bg-card/30 px-4 py-2 print:hidden sm:h-12 sm:flex-row sm:items-center sm:gap-3 sm:py-0">
      <div className="flex min-w-0 items-center gap-3">
      <SidebarTrigger className="-ml-1 min-h-10 min-w-10 text-muted-foreground hover:text-foreground sm:min-h-7 sm:min-w-7" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 bg-border/50 sm:block" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={crumb.label} className={i === crumbs.length - 1 ? "contents" : "hidden sm:contents"}>
                {i > 0 && <BreadcrumbSeparator className="hidden sm:inline-flex" />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="max-w-[12rem] truncate text-foreground sm:max-w-none">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.href!} className="text-muted-foreground hover:text-foreground">
                        {crumb.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      </div>
      <div className="flex items-center gap-2 sm:ml-auto">
        <WaLookup />
        <ThemeToggle />
      </div>
    </header>
  );
}

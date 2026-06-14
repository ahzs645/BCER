import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
    <form onSubmit={submit} className="ml-auto flex items-center gap-1">
      <Input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Go to WA #"
        aria-label="Jump to well authorization number"
        className="h-8 w-28 bg-muted/50 text-sm sm:w-36"
      />
      <button
        type="submit"
        aria-label="Go to well"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-input bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

export function TopBar() {
  const crumbs = useBreadcrumbs();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border/50 bg-card/30 px-4 print:hidden">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="mr-1 h-4 bg-border/50" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={crumb.label} className="contents">
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="text-foreground">{crumb.label}</BreadcrumbPage>
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
      <WaLookup />
    </header>
  );
}

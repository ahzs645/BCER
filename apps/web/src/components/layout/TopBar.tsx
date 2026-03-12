import { useLocation, Link } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
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

export function TopBar() {
  const crumbs = useBreadcrumbs();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border/50 bg-card/30 px-4">
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
    </header>
  );
}

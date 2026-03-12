import { useEffect, useState } from "react";
import { fetchSourceMeta } from "@/lib/api";
import type { SourceMeta } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function AboutPage() {
  const [meta, setMeta] = useState<SourceMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSourceMeta()
      .then((response) => { if (!cancelled) setMeta(response); })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load source metadata.");
      });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (!meta) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const sourceWebsite = meta.sourceWebsite.startsWith("http")
    ? meta.sourceWebsite
    : `https://${meta.sourceWebsite}`;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Provenance & Attribution</p>
            <h2 className="mt-1 text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
              Source notes from the original BCER workbook.
            </h2>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Badge variant="outline">Current to {meta.dataCurrentTo}</Badge>
            <Badge variant="outline">Imported {meta.importTimestamp}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Source & Maintainer */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Source</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm">{meta.sourceAgency}</p>
            <a href={sourceWebsite} rel="noreferrer" target="_blank" className="text-sm text-primary hover:underline">
              {meta.sourceWebsite}
            </a>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Maintainer</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm">{meta.authorName}</p>
            <a href={`mailto:${meta.authorEmail}`} className="text-sm text-primary hover:underline">
              {meta.authorEmail}
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Prose */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-5">
          {meta.aboutParagraphs.map((paragraph, index) =>
            index === 0 ? (
              <h3 key={paragraph} className="mb-3 text-lg font-semibold font-[family-name:var(--font-heading)]">
                {paragraph}
              </h3>
            ) : (
              <p key={`${index}-${paragraph}`} className="mb-3 max-w-[70ch] text-sm leading-relaxed text-muted-foreground last:mb-0">
                {paragraph}
              </p>
            ),
          )}
        </CardContent>
      </Card>
    </div>
  );
}

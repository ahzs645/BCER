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
              Based on the original BCER workbook by Macauley & Associates Consulting Inc.
            </h2>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Badge variant="outline">Current to {meta.dataCurrentTo}</Badge>
            <Badge variant="outline">Imported {meta.importTimestamp}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Original Author */}
      <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-primary">Original Work By</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)]">
            Macauley & Associates Consulting Inc.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">742 Hampshire Road, Victoria, BC Canada V8S 4S4</p>

          <div className="mt-4 space-y-1">
            <p className="text-sm font-medium">George Macauley</p>
            <p className="text-sm text-muted-foreground">
              Trained economist and lawyer. Consulting to the BC provincial government and private industry since 1991
              in oil & gas economics, aboriginal affairs, justice transformation, carbon offsets, forestry, gaming, and
              general policy development. Extensive background in Oracle application development and financial/economic
              modeling.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="text-muted-foreground">
              Phone: <a href="tel:+12508128148" className="text-primary hover:underline">(250) 812-8148</a>
            </span>
            <span className="text-muted-foreground">
              Email: <a href="mailto:office@macauley.ca" className="text-primary hover:underline">office@macauley.ca</a>
            </span>
            <span className="text-muted-foreground">
              Web: <a href="http://www.macauley.ca" rel="noreferrer" target="_blank" className="text-primary hover:underline">www.macauley.ca</a>
            </span>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            The original Excel workbook and Access database for viewing British Columbia natural gas drilling and
            production information by well can be downloaded from{" "}
            <a href="http://www.macauley.ca" rel="noreferrer" target="_blank" className="text-primary hover:underline">
              www.macauley.ca
            </a>
            . Data is publicly available from the BC Energy Regulator (formerly the Oil and Gas Commission).
          </p>
        </CardContent>
      </Card>

      {/* Source & Data */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Data Source</CardTitle>
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
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">This Web Application</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              A web-based viewer built on top of the original workbook and database created by George Macauley
              at Macauley & Associates Consulting Inc.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Legal */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-5">
          <h3 className="mb-3 text-lg font-semibold font-[family-name:var(--font-heading)]">
            A Few Words (and Legal Stuff)
          </h3>
          <p className="mb-3 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
            The data presented in this application is publicly available from the British Columbia Energy Regulator
            (BCER) website (<a href={sourceWebsite} rel="noreferrer" target="_blank" className="text-primary hover:underline">www.bc-er.ca</a>).
            The BCER provides this data to industry and members of the public. We are not aware of any restrictions
            that the BCER has placed upon the use of its data, but the BCER should be appropriately credited when
            information from its website (or summarized in the original workbook and accompanying Access database) is cited.
          </p>
          <p className="mb-3 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
            The original workbook author has accessed, assembled and (in some cases) processed the BCER data to present
            it in a readily accessible format. This application is provided without any representation or warranty that
            the information contained herein is complete, correct or current. We accept no legal liability for any
            actions taken or harm suffered in reliance upon the contents of this application or any associated database.
            We advise you to access data directly from the BCER website if you intend to use the data for commercial purposes.
          </p>
          <p className="mb-3 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
            The data is current to {meta.dataCurrentTo}. We understand that the data does not include any information
            that the BCER treats as confidential (in particular for experimental wells) until the confidentiality
            period has passed. We only present information provided on the BCER website and make no representation or
            warranty as to its completeness, correctness, currency or fitness for any particular purpose.
          </p>
          <p className="mb-3 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
            For more information about the original workbook and periodic data refreshes, please contact:
          </p>
          <p className="max-w-[70ch] text-sm leading-relaxed">
            <a href="mailto:office@macauley.ca" className="text-primary hover:underline">office@macauley.ca</a>
            {" "}&mdash; George Macauley, Macauley & Associates Consulting Inc.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

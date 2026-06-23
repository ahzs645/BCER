import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  /** When set, the whole card becomes a router link to this path. */
  to?: string;
}

export function StatCard({ label, value, to }: StatCardProps) {
  const card = (
    <Card className="glow-card h-full border-border/50 bg-card/60 backdrop-blur-sm transition-colors">
      <CardContent className="p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-bold font-[family-name:var(--font-heading)] text-foreground">{value}</p>
      </CardContent>
    </Card>
  );

  if (!to) return card;

  return (
    <Link
      to={to}
      className="block rounded-xl outline-none ring-primary/50 transition-shadow hover:ring-2 focus-visible:ring-2 [&>*]:hover:border-primary/40"
    >
      {card}
    </Link>
  );
}

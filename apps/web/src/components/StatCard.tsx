import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <Card className="glow-card border-border/50 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-bold font-[family-name:var(--font-heading)] text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

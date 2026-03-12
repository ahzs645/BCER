import { useSyncExternalStore, type CSSProperties } from "react";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

export function useChartTheme() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot);

  const tooltipStyle: CSSProperties = isDark
    ? {
        backgroundColor: "hsl(220 18% 12%)",
        border: "1px solid hsl(220 15% 20%)",
        borderRadius: "0.5rem",
        color: "hsl(210 20% 90%)",
      }
    : {
        backgroundColor: "hsl(0 0% 100%)",
        border: "1px solid hsl(220 13% 87%)",
        borderRadius: "0.5rem",
        color: "hsl(222 20% 12%)",
      };

  const axisTickStyle = {
    fill: isDark ? "hsl(215 15% 55%)" : "hsl(215 15% 45%)",
    fontSize: 11,
  };

  const gridStroke = isDark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.15)";

  return { tooltipStyle, axisTickStyle, gridStroke };
}

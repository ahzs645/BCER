import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import { App } from "./App";
import { DashboardPage } from "./pages/DashboardPage";
import { AboutPage } from "./pages/AboutPage";
import { SearchPage } from "./pages/SearchPage";
import { OperatorsPage } from "./pages/OperatorsPage";
import { WellDetailPage } from "./pages/WellDetailPage";
import "./styles/globals.css";

const MapPage = lazy(() => import("./pages/MapPage").then((m) => ({ default: m.MapPage })));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<DashboardPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="operators" element={<OperatorsPage />} />
          <Route path="map" element={<Suspense><MapPage /></Suspense>} />
          <Route path="wells/:waNum" element={<WellDetailPage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
      </Routes>
    </HashRouter>
    </ThemeProvider>
  </StrictMode>,
);

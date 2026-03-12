import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { App } from "./App";
import { WellDetailPage } from "./pages/WellDetailPage";

const detailPayload = {
  overview: {
    waNum: 49886,
    wellName: "TOURMALINE HZ TEST WELL",
    operator: "TOURMALINE OIL CORP.",
    operatorId: 831,
    operatorAbbr: "TOURMALINE ",
    uwiList: ["207B090A094B1600"],
    areaCode: 94,
    areaDesc: "Town",
    formCode: 1600,
    formDesc: "Montney",
    spudMon: 202403,
    rigRelMon: 202404,
    firstProdMon: 202404,
    orientation: "HZ",
    surfLat: 56.12345,
    surfLon: -121.54321,
    grid: null,
    gasProd3Yr: 123456.7,
    gasProd5Yr: 123456.7,
    firstProdPeriod: 202404,
    totalMDepth: 4379,
    maxTvDepth: 1778.06,
    wellClassification: "DV",
  },
  activityLocations: [
    {
      uwi: "207B090A094B1600",
      uwiOrder: 1,
      areaCode: 9022,
      areaDesc: "NORTHERN MONTNEY",
      formCode: 5000,
      formDesc: "MONTNEY",
    },
  ],
  productionSeries: [
    {
      periodLabel: "2024-04",
      periodIndex: 1,
      gasVolumeKm3: 100,
      gasVolumeMcf: 3531.47,
      gasVolumeKmcf: 3.531,
      avgDailyKm3: 12,
      avgDailyMcf: 423.776,
      avgDailyKmcf: 0.424,
    },
  ],
  calendarYearSeries: [
    {
      calendarYear: "2024",
      gasKm3: 74512,
      gasMcf: 2631434.846,
      gasKmcf: 2631.435,
      avgDailyKm3: 218.703,
      avgDailyMcf: 7722.245,
      avgDailyKmcf: 7.722,
    },
  ],
  fiscalYearSeries: [
    {
      fiscalYear: "FYE2024",
      gasKm3: 74512,
      gasMcf: 2631434.846,
      gasKmcf: 2631.435,
      oilM3: 12,
      oilBbl: 75.478,
      condensateM3: 25,
      condensateBbl: 157.245,
      avgDailyKm3: 218.703,
      avgDailyMcf: 7722.245,
      avgDailyKmcf: 7.722,
    },
  ],
  fracSummary: [{ total_stages: 24, total_sand_tonnes: 12345 }],
  fracDescriptions: Array.from({ length: 6 }, (_, index) => ({
    compltn_order: index + 1,
    compltn_date: 20240101 + index,
    compltn_summry: `Frac row ${index + 1}`,
  })),
  gasAnalysis: [
    {
      sampleDate: 20240815,
      sampleOrder: 1,
      h2Fractn: 0.0001,
      heliumFractn: 0,
      co2Fractn: 0.0014,
      h2sFractn: 0,
      n2Fractn: 0.0014,
      c1Fractn: 0.8296,
      c2Fractn: 0.1,
      c3Fractn: 0.04,
      ic4Fractn: 0.01,
      nc4Fractn: 0.01,
      ic5Fractn: 0.003,
      nc5Fractn: 0.002,
      c6ToC10Fractn: 0.001,
    },
  ],
  recentGasAnalysis: [
    {
      sampleDate: 20240815,
      sampleOrder: 1,
      h2Fractn: 0.0001,
      heliumFractn: 0,
      co2Fractn: 0.0014,
      h2sFractn: 0,
      n2Fractn: 0.0014,
      c1Fractn: 0.8296,
      c2Fractn: 0.1,
      c3Fractn: 0.04,
      ic4Fractn: 0.01,
      nc4Fractn: 0.01,
      ic5Fractn: 0.003,
      nc5Fractn: 0.002,
      c6ToC10Fractn: 0.001,
    },
  ],
  directionalSurvey: [{ total_m_depth: 4379, max_tv_depth: 1778.06 }],
  drillingEvents: [{ spud_date: 20240312, rig_rel_date: 20240421 }],
  casings: Array.from({ length: 6 }, (_, index) => ({
    position: index + 1,
    casing_size: 114.3,
    casing_type: "PROD",
  })),
  payZones: [{ position: 1, zone_name: "Montney" }],
  abandonment: Array.from({ length: 6 }, (_, index) => ({
    position: index + 1,
    plug_num: index + 1,
    remarks: `Abandonment row ${index + 1}`,
  })),
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/meta/source")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              authorName: "George Macauley",
              authorEmail: "office@macauley.ca",
              sourceAgency: "British Columbia Energy Regulator",
              sourceWebsite: "www.bc-er.ca",
              dataCurrentTo: "November 2025",
              importTimestamp: "2026-03-12T00:00:00Z",
              aboutParagraphs: ["A Few Words (and Legal Stuff)"],
            }),
          ),
        );
      }

      if (url.includes("/api/wells/49886")) {
        return Promise.resolve(new Response(JSON.stringify(detailPayload)));
      }

      throw new Error(`Unexpected request: ${url}`);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("renders workbook-style subsheets and parity controls on the detail page", async () => {
  render(
    <MemoryRouter initialEntries={["/wells/49886"]}>
      <Routes>
        <Route path="/" element={<App />}>
          <Route path="wells/:waNum" element={<WellDetailPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getByText("Workbook Subsheets")).toBeInTheDocument();
  });

  expect(screen.getByText("Production Snapshot")).toBeInTheDocument();
  expect(screen.getByText("Production Graphs")).toBeInTheDocument();
  expect(screen.getByText("Monthly Production")).toBeInTheDocument();
  expect(screen.getByText("Most Recent Gas Analyses")).toBeInTheDocument();
  expect(screen.getByText("Liquids in m3")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Production" }));
  expect(screen.getByText("Calendar Year Gas")).toBeInTheDocument();
  expect(screen.getByText("Fiscal Year Liquids")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Fracs" }));
  expect(screen.getByLabelText("Frac records")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Casings" }));
  expect(screen.getByLabelText("Casing records")).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Last 5 Segments" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Abandonment" }));
  expect(screen.getByLabelText("Abandonment records")).toBeInTheDocument();
});

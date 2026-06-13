import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { App } from "./App";
import { ThemeProvider } from "./lib/theme";
import { SearchPage } from "./pages/SearchPage";

const meta = {
  authorName: "George Macauley",
  authorEmail: "office@macauley.ca",
  sourceAgency: "British Columbia Energy Regulator",
  sourceWebsite: "www.bc-er.ca",
  dataCurrentTo: "November 2025",
  importTimestamp: "2026-03-12T00:00:00Z",
  aboutParagraphs: ["A Few Words (and Legal Stuff)"],
};

const searchIndex = [
  {
    waNum: 49886,
    wellName: "TOURMALINE HZ TEST WELL",
    operator: "TOURMALINE OIL CORP.",
    operatorId: 831,
    operatorAbbr: "TOURMALINE",
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
    gasProd3Yr: 123456.7,
    gasProd5Yr: 123456.7,
  },
];

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/data/meta.json")) {
        return Promise.resolve(new Response(JSON.stringify(meta)));
      }

      if (url.includes("/data/wells/search.json")) {
        return Promise.resolve(new Response(JSON.stringify(searchIndex)));
      }

      throw new Error(`Unexpected request: ${url}`);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("renders the BCER search dashboard", async () => {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/" element={<App />}>
            <Route path="search" element={<SearchPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );

  expect(screen.getByText("BCER Data Viewer")).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getAllByText(/Current to November 2025/).length).toBeGreaterThan(0);
  });
  expect(screen.getByRole("button", { name: "Search wells" })).toBeInTheDocument();
});

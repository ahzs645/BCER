import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { App } from "./App";
import { SearchPage } from "./pages/SearchPage";

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

      return Promise.resolve(
        new Response(
          JSON.stringify({
            items: [],
            total: 0,
            page: 1,
            pageSize: 25,
            totalPages: 1,
          }),
        ),
      );
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("renders the BCER search dashboard", async () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<SearchPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  expect(screen.getByText("BCER Data Viewer")).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText(/Current to November 2025/)).toBeInTheDocument();
  });
  expect(screen.getByRole("button", { name: "Search wells" })).toBeInTheDocument();
});

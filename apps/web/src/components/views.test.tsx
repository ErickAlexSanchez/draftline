import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { DraftList } from "./DraftList";
import { JobDetail } from "./JobDetail";
import { JobList } from "./JobList";

const JOB_ID = "44444444-4444-4444-8444-444444444444";

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: Infinity } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("JobList", () => {
  it("shows a loading state, then an empty queue", async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    global.fetch = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    renderWithQuery(<JobList />);
    expect(screen.getByText("Loading jobs…")).toBeInTheDocument();
    resolveFetch(json({ jobs: [] }));
    expect(await screen.findByText("No jobs yet.")).toBeInTheDocument();
  });

  it("shows an error state and retries", async () => {
    const user = userEvent.setup();
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      if (calls === 1) return json({ error: { code: "internal" } }, 500);
      return json({ jobs: [] });
    });
    renderWithQuery(<JobList />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load jobs.");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No jobs yet.")).toBeInTheDocument();
  });
});

describe("JobDetail", () => {
  it("shows loading and error states", async () => {
    global.fetch = jest.fn(async () => json({ error: { code: "internal" } }, 500));
    const { unmount } = renderWithQuery(<JobDetail jobId={JOB_ID} pollMs={1000} />);
    expect(screen.getByText("Loading job…")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load this job.");
    unmount();
  });

  it("moves from queued to succeeded and then stops polling", async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      const status = calls === 1 ? "queued" : "succeeded";
      return json({
        job: {
          id: JOB_ID,
          title: "Harbor notes",
          status,
          createdAt: "2026-01-01T00:00:00.000Z",
          failureCode: null,
          prompt: "Write a welcome.",
          outputText: status === "succeeded" ? "Review it before you share it." : null,
        },
      });
    });
    renderWithQuery(<JobDetail jobId={JOB_ID} pollMs={30} />);
    expect(await screen.findByText("Queued")).toBeInTheDocument();
    expect(await screen.findByText("Succeeded")).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveTextContent("Review it before you share it.");
    await new Promise((resolve) => setTimeout(resolve, 120));
    const settled = calls;
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(calls).toBe(settled);
  });
});

describe("DraftList", () => {
  it("shows loading, empty, and error states", async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    global.fetch = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const first = renderWithQuery(<DraftList canWrite={false} />);
    expect(screen.getByText("Loading drafts…")).toBeInTheDocument();
    resolveFetch(json({ drafts: [] }));
    expect(await screen.findByText("No saved drafts yet.")).toBeInTheDocument();
    first.unmount();

    global.fetch = jest.fn(async () => json({ error: { code: "internal" } }, 500));
    renderWithQuery(<DraftList canWrite={false} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load drafts.");
  });
});

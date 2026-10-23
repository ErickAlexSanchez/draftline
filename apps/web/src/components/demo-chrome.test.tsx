import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { messages } from "../lib/i18n";
import { PREFS_BOOT } from "../lib/prefs-boot";
import { PreferencesProvider } from "../lib/preferences";
import { HeaderControls } from "./HeaderControls";
import { JobList } from "./JobList";
import { LoginScreen } from "./LoginScreen";
import { NewJobForm } from "./NewJobForm";
import { NewJobScreen } from "./NewJobScreen";
import { Shell } from "./Shell";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

const originalMatchMedia = window.matchMedia;

function setMatchMedia(state: { matches: boolean }, listen?: (notify: () => void) => void): void {
  window.matchMedia = (() => ({
    get matches() {
      return state.matches;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_type: string, listener: EventListener) => {
      listen?.(() => listener(new Event("change")));
    },
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

function renderApp(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: Infinity } },
  });
  return render(
    <PreferencesProvider>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </PreferencesProvider>,
  );
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function account(role: "editor" | "viewer", credits = 7): Response {
  return json({
    email: role === "editor" ? "editor@draftline.example" : "viewer@draftline.example",
    role,
    tenantName: "Draftline",
    credits,
  });
}

function expectBefore(first: HTMLElement, second: HTMLElement): void {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = "en";
  delete document.documentElement.dataset.theme;
  document.documentElement.style.removeProperty("color-scheme");
  document.body.style.overflow = "";
  setMatchMedia({ matches: false });
});

afterEach(() => {
  if (originalMatchMedia) window.matchMedia = originalMatchMedia;
  else delete (window as { matchMedia?: typeof window.matchMedia }).matchMedia;
});

describe("demo copy", () => {
  it("keeps the try-it line on the same status words as the badges", () => {
    expect(messages.en.tryIt).toBe("Sign in as editor, create a job, and watch Queued become Succeeded.");
    expect(messages.en.tryIt).toContain(messages.en.statusQueued);
    expect(messages.en.tryIt).toContain(messages.en.statusSucceeded);
    expect(messages.es.tryIt).toContain(messages.es.statusQueued);
    expect(messages.es.tryIt).toContain(messages.es.statusSucceeded);
    expect(PREFS_BOOT).toContain('localStorage.getItem("locale")');
    expect(PREFS_BOOT).toContain('localStorage.getItem("theme")');
    expect(PREFS_BOOT).toContain("prefers-color-scheme: dark");
  });
});

describe("HeaderControls", () => {
  function controls(): ReactNode {
    return (
      <>
        <button type="button">Outside</button>
        <HeaderControls />
      </>
    );
  }

  it("opens the English demo dialog and returns focus", async () => {
    const user = userEvent.setup();
    renderApp(<>{controls()}</>);
    const help = screen.getByRole("button", { name: "About this demo" });
    await user.click(help);

    const dialog = screen.getByRole("dialog", { name: "About this demo" });
    expect(dialog).toHaveFocus();
    expect(dialog).toHaveTextContent("What this app is");
    expect(dialog).toHaveTextContent("portfolio version");
    expect(dialog).toHaveTextContent("confidential original cannot be shown");
    expect(dialog).toHaveTextContent("fictional brand");
    expect(screen.getByRole("heading", { name: "Case study" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Architecture and why" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Demo access" })).toBeInTheDocument();
    for (const point of messages.en.architecturePoints) expect(dialog).toHaveTextContent(point);
    expect(dialog).toHaveTextContent(messages.en.editorAccount);
    expect(dialog).toHaveTextContent(messages.en.viewerAccount);
    expect(dialog).toHaveTextContent(messages.en.tryIt);
    expect(document.body.style.overflow).toBe("hidden");

    const close = screen.getByRole("button", { name: "Close" });
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    expect(screen.getByRole("button", { name: "Outside" })).not.toHaveFocus();

    fireEvent.mouseDown(dialog);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const backdrop = document.querySelector(".dialog-backdrop");
    if (!backdrop) throw new Error("Missing dialog backdrop");
    fireEvent.mouseDown(backdrop);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(help).toHaveFocus();
    expect(document.body.style.overflow).toBe("");

    await user.click(help);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(help).toHaveFocus();
  });

  it("switches language into Spanish and stores locale", async () => {
    const user = userEvent.setup();
    renderApp(<HeaderControls />);
    expect(screen.getByRole("radio", { name: "English" })).toHaveTextContent("EN");
    expect(screen.getByRole("radio", { name: "Español" })).toHaveTextContent("ES");

    await user.click(screen.getByRole("radio", { name: "Español" }));
    expect(localStorage.getItem("locale")).toBe("es");
    expect(document.documentElement.lang).toBe("es");
    const help = screen.getByRole("button", { name: "Acerca de esta demo" });
    await user.click(help);
    const dialog = screen.getByRole("dialog", { name: "Acerca de esta demo" });
    expect(screen.getByRole("heading", { name: "Qué es esta aplicación" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Caso de estudio" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Arquitectura y por qué" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Acceso a la demo" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("versión de portafolio");
    expect(dialog).toHaveTextContent("no se puede mostrar");
    expect(dialog).toHaveTextContent("marca ficticia");
    for (const point of messages.es.architecturePoints) expect(dialog).toHaveTextContent(point);
    expect(dialog).toHaveTextContent("editor@draftline.example / editor-local-pass");
    expect(dialog).toHaveTextContent("viewer@draftline.example / viewer-local-pass");
    expect(dialog).toHaveTextContent("403");
    expect(dialog).toHaveTextContent(messages.es.tryIt);
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });

  it("moves between languages with the arrow keys", async () => {
    const user = userEvent.setup();
    renderApp(<HeaderControls />);
    screen.getByRole("radio", { name: "English" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(localStorage.getItem("locale")).toBe("es");
    expect(screen.getByRole("radio", { name: "Español" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("radio", { name: "English" })).toHaveFocus();
  });

  it("ignores an unknown locale and an unknown theme", () => {
    localStorage.setItem("locale", "fr");
    localStorage.setItem("theme", "blue");
    setMatchMedia({ matches: true });
    renderApp(<HeaderControls />);
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("button", { name: "About this demo" })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("uses the saved theme over the system theme", async () => {
    const user = userEvent.setup();
    localStorage.setItem("theme", "light");
    setMatchMedia({ matches: true });
    renderApp(<HeaderControls />);
    const theme = screen.getByRole("switch", { name: "Dark theme" });
    expect(theme).toHaveAttribute("aria-checked", "false");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    await user.click(theme);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(theme).toHaveAttribute("aria-checked", "true");
    await user.click(theme);
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("follows prefers-color-scheme until the reader chooses a theme", () => {
    const state = { matches: true };
    let notify = (): void => undefined;
    setMatchMedia(state, (listener) => {
      notify = listener;
    });
    renderApp(<HeaderControls />);
    expect(localStorage.getItem("theme")).toBeNull();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("switch", { name: "Dark theme" })).toHaveAttribute("aria-checked", "true");

    state.matches = false;
    act(() => notify());
    expect(localStorage.getItem("theme")).toBeNull();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});

describe("shell and job labels", () => {
  it("places the controls in the workspace header before the account", async () => {
    global.fetch = jest.fn(async () => account("editor", 7));
    renderApp(
      <Shell>
        <h1>Jobs</h1>
      </Shell>,
    );
    const banner = screen.getByRole("banner");
    const help = screen.getByRole("button", { name: "About this demo" });
    const english = screen.getByRole("radio", { name: "English" });
    const spanish = screen.getByRole("radio", { name: "Español" });
    const theme = screen.getByRole("switch", { name: "Dark theme" });
    expect(banner).toContainElement(help);
    expect(banner).toContainElement(english);
    expect(banner).toContainElement(spanish);
    expect(banner).toContainElement(theme);
    expectBefore(help, english);
    expectBefore(english, spanish);
    expectBefore(spanish, theme);
    expect(await screen.findByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expectBefore(theme, screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByText("Model credits: 7")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New job" })).toBeInTheDocument();
  });

  it("places the same controls in the sign-in header", () => {
    renderApp(<LoginScreen />);
    const banner = screen.getByRole("banner");
    expect(banner).toContainElement(screen.getByRole("button", { name: "About this demo" }));
    expect(banner).toContainElement(screen.getByRole("radio", { name: "English" }));
    expect(banner).toContainElement(screen.getByRole("switch", { name: "Dark theme" }));
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("translates the shell, the job list, and the new-job form", async () => {
    localStorage.setItem("locale", "es");
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/jobs")) {
        return json({
          jobs: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              title: "Harbor notes",
              status: "queued",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      return account("editor", 4);
    });
    renderApp(<NewJobScreen />);
    expect(await screen.findByRole("heading", { name: "Nuevo trabajo" })).toBeInTheDocument();
    expect(screen.getByText("Encolar guarda el brief. El worker escribe el borrador.")).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toBeInTheDocument();
    expect(screen.getByLabelText("Brief")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Encolar borrador" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trabajos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Borradores" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
    expect(screen.getByText("Créditos del modelo: 4")).toBeInTheDocument();
    expect(screen.getByText("Versión de portafolio. Espacio de trabajo sintético.")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("es");
  });

  it("translates the job list status and columns", async () => {
    localStorage.setItem("locale", "es");
    global.fetch = jest.fn(async () =>
      json({
        jobs: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            title: "Harbor notes",
            status: "succeeded",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );
    renderApp(<JobList />);
    expect(await screen.findByRole("columnheader", { name: "Título" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Estado" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Creado" })).toBeInTheDocument();
    expect(screen.getByText("Completado")).toBeInTheDocument();
  });

  it("tells a viewer, in Spanish, that enqueueing is for editors", async () => {
    localStorage.setItem("locale", "es");
    global.fetch = jest.fn(async () => account("viewer", 0));
    renderApp(
      <Shell>
        <p>Queue</p>
      </Shell>,
    );
    expect(await screen.findByText("Puedes leer la cola. Los editores encolan borradores nuevos.")).toBeInTheDocument();
    expect(screen.getByText("Lector")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nuevo trabajo" })).not.toBeInTheDocument();
  });

  it("shows the controls while the workspace is still loading", () => {
    global.fetch = jest.fn(() => new Promise<Response>(() => undefined));
    renderApp(
      <Shell>
        <h1>Jobs</h1>
      </Shell>,
    );
    const banner = screen.getByRole("banner");
    expect(banner).toContainElement(screen.getByRole("button", { name: "About this demo" }));
    expect(screen.getByText("Loading workspace…")).toBeInTheDocument();
  });
});

describe("NewJobForm labels without a provider stay in English", () => {
  it("renders the English enqueue action", () => {
    render(<NewJobForm onCreated={() => undefined} />);
    expect(screen.getByRole("button", { name: "Enqueue draft" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Brief")).toBeInTheDocument();
  });
});

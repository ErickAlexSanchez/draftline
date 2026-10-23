export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];

export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];

export const LOCALE_KEY = "locale";
export const THEME_KEY = "theme";

export type Copy = {
  aboutDemo: string;
  close: string;
  language: string;
  languageEnglish: string;
  languageSpanish: string;
  darkTheme: string;
  skipToContent: string;
  loadingWorkspace: string;
  redirecting: string;
  workspaceError: string;
  retry: string;
  tagline: string;
  navLabel: string;
  jobs: string;
  drafts: string;
  newJob: string;
  editor: string;
  viewer: string;
  credits: string;
  signOut: string;
  signOutError: string;
  viewerBanner: string;
  footer: string;
  loadingJobs: string;
  jobsError: string;
  emptyJobs: string;
  jobsCaption: string;
  columnTitle: string;
  columnStatus: string;
  columnCreated: string;
  newJobLead: string;
  newJobViewer: string;
  fieldTitle: string;
  fieldBrief: string;
  briefHint: string;
  enqueueing: string;
  enqueue: string;
  enqueueForbidden: string;
  enqueueInvalid: string;
  enqueueFailed: string;
  loginLead: string;
  email: string;
  password: string;
  signingIn: string;
  signIn: string;
  signInInvalid: string;
  signInFailed: string;
  whatHeading: string;
  whatBody: string;
  caseHeading: string;
  caseBody: string;
  architectureHeading: string;
  architectureWhy: string;
  architecturePoints: [string, string, string, string, string, string];
  accessHeading: string;
  accessLead: string;
  editorAccount: string;
  viewerAccount: string;
  tryIt: string;
  statusQueued: string;
  statusRunning: string;
  statusSucceeded: string;
  statusFailed: string;
};

function copy(value: Copy): Copy {
  return value;
}

export const messages: Record<Locale, Copy> = {
  en: copy({
    aboutDemo: "About this demo",
    close: "Close",
    language: "Language",
    languageEnglish: "English",
    languageSpanish: "Español",
    darkTheme: "Dark theme",
    skipToContent: "Skip to content",
    loadingWorkspace: "Loading workspace…",
    redirecting: "Redirecting to sign in…",
    workspaceError: "Couldn't load the workspace.",
    retry: "Retry",
    tagline: "Briefs become drafts.",
    navLabel: "Workspace",
    jobs: "Jobs",
    drafts: "Drafts",
    newJob: "New job",
    editor: "Editor",
    viewer: "Viewer",
    credits: "Model credits: {count}",
    signOut: "Sign out",
    signOutError: "Couldn't sign out.",
    viewerBanner: "You can read the queue. Editors enqueue new drafts.",
    footer: "Portfolio version. Synthetic workspace.",
    loadingJobs: "Loading jobs…",
    jobsError: "Couldn't load jobs.",
    emptyJobs: "No jobs yet.",
    jobsCaption: "Generation jobs",
    columnTitle: "Title",
    columnStatus: "Status",
    columnCreated: "Created",
    newJobLead: "Enqueueing stores the brief. The worker writes the draft.",
    newJobViewer: "You can read drafts. Only editors can enqueue them.",
    fieldTitle: "Title",
    fieldBrief: "Brief",
    briefHint: "Up to 4000 characters. The worker writes the draft after the job is queued.",
    enqueueing: "Enqueueing…",
    enqueue: "Enqueue draft",
    enqueueForbidden: "You do not have permission to enqueue drafts.",
    enqueueInvalid: "Check the title and the brief.",
    enqueueFailed: "Couldn't enqueue the draft.",
    loginLead: "Sign in to read the queue or enqueue a brief.",
    email: "Email",
    password: "Password",
    signingIn: "Signing in…",
    signIn: "Sign in",
    signInInvalid: "Email or password is incorrect.",
    signInFailed: "Couldn't sign in.",
    whatHeading: "What this app is",
    whatBody:
      "Draftline turns a writing brief into a draft. Editors enqueue jobs, a worker writes the draft, and viewers can read the queue.",
    caseHeading: "Case study",
    caseBody:
      "This is a portfolio version of a production system. The confidential original cannot be shown. Draftline is a fictional brand. It follows the same architecture decisions, with a different scope, brand, and data.",
    architectureHeading: "Architecture and why",
    architectureWhy:
      "The request returns as soon as the job is stored. Generation happens later, where caching and the credit budget can bound it.",
    architecturePoints: [
      "POST /jobs returns an id without calling the model.",
      "A worker calls the model.",
      "TanStack Query caches the list and does not cache generation.",
      "Postgres stores users, roles, prompts, and job state.",
      "Files go through object storage.",
      "A per-tenant credit budget limits model use.",
    ],
    accessHeading: "Demo access",
    accessLead: "Two local accounts are available.",
    editorAccount: "editor@draftline.example / editor-local-pass can enqueue.",
    viewerAccount:
      "viewer@draftline.example / viewer-local-pass can read the queue and receives 403 when enqueueing.",
    tryIt: "Sign in as editor, create a job, and watch Queued become Succeeded.",
    statusQueued: "Queued",
    statusRunning: "Running",
    statusSucceeded: "Succeeded",
    statusFailed: "Failed",
  }),
  es: copy({
    aboutDemo: "Acerca de esta demo",
    close: "Cerrar",
    language: "Idioma",
    languageEnglish: "English",
    languageSpanish: "Español",
    darkTheme: "Tema oscuro",
    skipToContent: "Saltar al contenido",
    loadingWorkspace: "Cargando el espacio de trabajo…",
    redirecting: "Redirigiendo al inicio de sesión…",
    workspaceError: "No se pudo cargar el espacio de trabajo.",
    retry: "Reintentar",
    tagline: "Los briefs se vuelven borradores.",
    navLabel: "Espacio de trabajo",
    jobs: "Trabajos",
    drafts: "Borradores",
    newJob: "Nuevo trabajo",
    editor: "Editor",
    viewer: "Lector",
    credits: "Créditos del modelo: {count}",
    signOut: "Cerrar sesión",
    signOutError: "No se pudo cerrar la sesión.",
    viewerBanner: "Puedes leer la cola. Los editores encolan borradores nuevos.",
    footer: "Versión de portafolio. Espacio de trabajo sintético.",
    loadingJobs: "Cargando trabajos…",
    jobsError: "No se pudieron cargar los trabajos.",
    emptyJobs: "Aún no hay trabajos.",
    jobsCaption: "Trabajos de generación",
    columnTitle: "Título",
    columnStatus: "Estado",
    columnCreated: "Creado",
    newJobLead: "Encolar guarda el brief. El worker escribe el borrador.",
    newJobViewer: "Puedes leer borradores. Solo los editores pueden encolarlos.",
    fieldTitle: "Título",
    fieldBrief: "Brief",
    briefHint: "Hasta 4000 caracteres. El worker escribe el borrador después de encolar el trabajo.",
    enqueueing: "Encolando…",
    enqueue: "Encolar borrador",
    enqueueForbidden: "No tienes permiso para encolar borradores.",
    enqueueInvalid: "Revisa el título y el brief.",
    enqueueFailed: "No se pudo encolar el borrador.",
    loginLead: "Entra para leer la cola o encolar un brief.",
    email: "Correo",
    password: "Contraseña",
    signingIn: "Entrando…",
    signIn: "Entrar",
    signInInvalid: "El correo o la contraseña no son correctos.",
    signInFailed: "No se pudo entrar.",
    whatHeading: "Qué es esta aplicación",
    whatBody:
      "Draftline convierte un brief de escritura en un borrador. Los editores encolan trabajos, un worker escribe el borrador y los lectores pueden ver la cola.",
    caseHeading: "Caso de estudio",
    caseBody:
      "Esta es una versión de portafolio de un sistema de producción. El original confidencial no se puede mostrar. Draftline es una marca ficticia. Sigue las mismas decisiones de arquitectura, con otro alcance, otra marca y otros datos.",
    architectureHeading: "Arquitectura y por qué",
    architectureWhy:
      "La petición responde en cuanto el trabajo queda guardado. La generación ocurre después, donde la caché y el presupuesto de créditos pueden acotarla.",
    architecturePoints: [
      "POST /jobs devuelve un id sin llamar al modelo.",
      "Un worker llama al modelo.",
      "TanStack Query cachea la lista y no cachea la generación.",
      "Postgres guarda usuarios, roles, prompts y el estado del trabajo.",
      "Los archivos pasan por object storage.",
      "Un presupuesto de créditos por tenant limita el uso del modelo.",
    ],
    accessHeading: "Acceso a la demo",
    accessLead: "Hay dos cuentas locales.",
    editorAccount: "editor@draftline.example / editor-local-pass puede encolar.",
    viewerAccount:
      "viewer@draftline.example / viewer-local-pass puede leer la cola y recibe 403 al encolar.",
    tryIt: "Entra como editor, crea un trabajo y observa cómo En cola pasa a Completado.",
    statusQueued: "En cola",
    statusRunning: "En curso",
    statusSucceeded: "Completado",
    statusFailed: "Fallido",
  }),
};

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "es";
}

export function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

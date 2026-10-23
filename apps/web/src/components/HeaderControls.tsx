"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "../lib/i18n";
import { useCopy, usePreferences } from "../lib/preferences";

const LANGUAGE_ORDER: readonly Locale[] = ["en", "es"];

function focusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(", ");
  return [...container.querySelectorAll<HTMLElement>(selector)].filter((element) => element.tabIndex >= 0);
}

function cycleFocus(dialog: HTMLElement, shift: boolean): void {
  const focusable = focusableElements(dialog);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) {
    dialog.focus({ preventScroll: true });
    return;
  }
  const active = document.activeElement;
  const current = active instanceof HTMLElement ? focusable.indexOf(active) : -1;
  const next = shift
    ? current <= 0
      ? last
      : focusable[current - 1]
    : current === -1 || current >= focusable.length - 1
      ? first
      : focusable[current + 1];
  next?.focus({ preventScroll: true });
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M19.2 4.8l-1.6 1.6M6.4 17.6l-1.6 1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="currentColor" d="M15.5 2.5a8.2 8.2 0 1 0 6 13.6 7 7 0 0 1-6-13.6z" />
    </svg>
  );
}

export function HeaderControls() {
  const copy = useCopy();
  const { locale, theme, setLocale, setTheme } = usePreferences();
  const [open, setOpen] = useState(false);
  const helpRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const englishRef = useRef<HTMLButtonElement>(null);
  const spanishRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const titleId = useId();
  const dialogId = useId();

  useLayoutEffect(() => {
    if (open) {
      dialogRef.current?.focus({ preventScroll: true });
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) helpRef.current?.focus({ preventScroll: true });
    wasOpen.current = false;
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      event.preventDefault();
      cycleFocus(dialog, event.shiftKey);
    };
    document.addEventListener("keydown", onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function selectLocale(next: Locale): void {
    setLocale(next);
    const target = next === "en" ? englishRef.current : spanishRef.current;
    target?.focus({ preventScroll: true });
  }

  function onLanguageKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const current = LANGUAGE_ORDER.indexOf(locale);
    let nextIndex = current;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (current + 1) % LANGUAGE_ORDER.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (current - 1 + LANGUAGE_ORDER.length) % LANGUAGE_ORDER.length;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = LANGUAGE_ORDER.length - 1;
    else return;
    event.preventDefault();
    const next = LANGUAGE_ORDER[nextIndex];
    if (!next) return;
    selectLocale(next);
  }

  function onBackdropMouseDown(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) setOpen(false);
  }

  const dialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="dialog-backdrop" onMouseDown={onBackdropMouseDown}>
            <div
              id={dialogId}
              ref={dialogRef}
              className="dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
            >
              <div className="dialog-head">
                <h2 id={titleId}>{copy.aboutDemo}</h2>
                <button type="button" className="tool-button" onClick={() => setOpen(false)}>
                  {copy.close}
                </button>
              </div>
              <section>
                <h3>{copy.whatHeading}</h3>
                <p>{copy.whatBody}</p>
              </section>
              <section>
                <h3>{copy.caseHeading}</h3>
                <p>{copy.caseBody}</p>
              </section>
              <section>
                <h3>{copy.architectureHeading}</h3>
                <p>{copy.architectureWhy}</p>
                <ul>
                  {copy.architecturePoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>{copy.accessHeading}</h3>
                <p>{copy.accessLead}</p>
                <ul>
                  <li>{copy.editorAccount}</li>
                  <li>{copy.viewerAccount}</li>
                </ul>
                <p>{copy.tryIt}</p>
              </section>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="header-controls">
      <button
        ref={helpRef}
        type="button"
        className="tool-button help-button"
        aria-label={copy.aboutDemo}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">?</span>
      </button>
      <div className="language-switch" role="radiogroup" aria-label={copy.language} onKeyDown={onLanguageKeyDown}>
        <button
          ref={englishRef}
          type="button"
          role="radio"
          className="tool-button"
          lang="en"
          aria-label={copy.languageEnglish}
          aria-checked={locale === "en"}
          tabIndex={locale === "en" ? 0 : -1}
          onClick={() => selectLocale("en")}
        >
          EN
        </button>
        <button
          ref={spanishRef}
          type="button"
          role="radio"
          className="tool-button"
          lang="es"
          aria-label={copy.languageSpanish}
          aria-checked={locale === "es"}
          tabIndex={locale === "es" ? 0 : -1}
          onClick={() => selectLocale("es")}
        >
          ES
        </button>
      </div>
      <button
        type="button"
        role="switch"
        className="tool-button"
        aria-label={copy.darkTheme}
        aria-checked={theme === "dark"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <MoonIcon /> : <SunIcon />}
      </button>
      {dialog}
    </div>
  );
}

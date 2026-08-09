import { useEffect, useMemo, useState } from "react";

import type { CourtOsResponsibilityBriefV1 } from "./responsibilityBriefPresentation";
import {
  deterministicCourtScribeBriefingPlan,
  localCourtScribeBriefingAdapterForRuntime,
  renderCourtScribeBriefingPlan,
  resolveCourtScribeBriefing,
  type CourtScribeBriefingPacketV1,
} from "./scribe/courtScribeBriefingContract";

import "./responsibilityHeadsBrief.css";

export interface CourtOsResponsibilityHeadsBriefProps {
  brief: CourtOsResponsibilityBriefV1;
  domain: string;
  roomLabel: string;
  responsibilityLabel: string;
  steward: {
    displayName: string;
    portrait?: { src: string; alt: string } | null;
  } | null;
  stewardNote: string;
  scribePacket?: CourtScribeBriefingPacketV1 | null;
  onManageStewardship?: () => void;
  onOpenHousePapers?: () => void;
}

interface CourtOsResponsibilityScribeDisplayV1 {
  mode: "generated" | "fallback";
  prose: string;
}

function initials(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function CourtOsResponsibilityHeadsBrief({
  brief,
  domain,
  roomLabel,
  responsibilityLabel,
  steward,
  stewardNote,
  scribePacket = null,
  onManageStewardship,
  onOpenHousePapers,
}: CourtOsResponsibilityHeadsBriefProps) {
  const fallbackScribe = useMemo<CourtOsResponsibilityScribeDisplayV1 | null>(() => {
    if (!scribePacket) return null;
    const plan = deterministicCourtScribeBriefingPlan(scribePacket);
    return {
      mode: "fallback" as const,
      prose: renderCourtScribeBriefingPlan(scribePacket, plan),
    };
  }, [scribePacket]);
  const [scribe, setScribe] = useState<CourtOsResponsibilityScribeDisplayV1 | null>(fallbackScribe);
  useEffect(() => {
    let active = true;
    setScribe(fallbackScribe);
    if (!scribePacket) return () => { active = false; };
    const adapter = localCourtScribeBriefingAdapterForRuntime();
    void (async () => {
      const first = await resolveCourtScribeBriefing({ packet: scribePacket, adapter });
      if (!active) return;
      setScribe({ mode: first.mode, prose: first.prose });
      if (first.mode === "generated") return;
      // The deterministic account remains visible. Warming and one retry are
      // quiet background work; there is no blocking spinner or raw model text.
      const warmed = await window.courtOsScribe?.warm().catch(() => false) ?? false;
      if (!active || !warmed) return;
      const retry = await resolveCourtScribeBriefing({ packet: scribePacket, adapter });
      if (active && retry.mode === "generated") {
        setScribe({ mode: retry.mode, prose: retry.prose });
      }
    })();
    return () => { active = false; };
  }, [fallbackScribe, scribePacket]);
  return (
    <section
      aria-label={`${responsibilityLabel} Head's Brief`}
      className="uat-responsibility-heads-brief"
      data-domain={domain}
      data-hoh-action-eligible={brief.actionSurfaceEligible ? "true" : "false"}
    >
      <header className="uat-responsibility-heads-brief__title">
        <span>
          <small>{roomLabel} · account before the Head</small>
          <strong>{responsibilityLabel}</strong>
        </span>
        {onOpenHousePapers ? (
          <button onClick={onOpenHousePapers} type="button">
            Open the House papers
          </button>
        ) : null}
      </header>

      <div className="uat-responsibility-heads-brief__steward">
        <figure>
          {steward?.portrait ? (
            <img src={steward.portrait.src} alt={steward.portrait.alt} />
          ) : (
            <span aria-hidden="true">{initials(steward?.displayName ?? "Unassigned")}</span>
          )}
        </figure>
        <div>
          <small>Accountable steward</small>
          <strong>{steward?.displayName ?? "No steward is recorded"}</strong>
          <p>{stewardNote}</p>
        </div>
        {onManageStewardship ? (
          <button onClick={onManageStewardship} type="button">
            Review stewardship
          </button>
        ) : null}
      </div>

      {scribe ? (
        <aside
          aria-label="Steward's spoken account"
          className="uat-responsibility-heads-brief__scribe"
          data-scribe-mode={scribe.mode}
        >
          <small>The steward's account</small>
          <p>{scribe.prose}</p>
        </aside>
      ) : null}

      <div className="uat-responsibility-heads-brief__account">
        {brief.sections.map((section, index) => (
          <article
            data-brief-section={section.key}
            data-state={section.state}
            key={section.key}
          >
            <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
            <div>
              <small>{section.label}</small>
              <strong>{section.heading}</strong>
              <p>{section.body}</p>
            </div>
          </article>
        ))}
      </div>

      <footer>
        <p>{brief.evidenceSummary}</p>
        <span>
          {brief.actionSurfaceEligible
            ? "The Head holds this charge and may answer for it directly."
            : steward
              ? "Recorded stewardship is delegated and brought to the Head."
              : "No steward is recorded for this charge; the House papers remain available for review."}
        </span>
      </footer>
    </section>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";

import type { CourtOsShellRuntimeModel } from "../courtosShellModel";
import {
  type CourtOsSpatialManor,
  type CourtOsSpatialPortfolio,
  type CourtOsSpatialState,
} from "./courtosSpatialClient";
import {
  COURTOS_CARTOGRAPHY_THEME_ID,
  type CourtOsMapLevel,
  isSpatialReadyMessage,
  rendererUrl,
  resolveMapGenBaseUrl,
} from "./embeddedMapContract";
import "./manorOperationsScene.css";

const MAPGEN_BASE_URL = resolveMapGenBaseUrl({
  configuredBaseUrl: import.meta.env.VITE_MAPGEN_BASE_URL,
  legacyViewerUrl: import.meta.env.VITE_MAPGEN_VIEWER_URL,
  development: import.meta.env.DEV,
});

const VIEWER_READY_TIMEOUT_MS = 12_000;

function manorFocus(manor: CourtOsSpatialManor) {
  return {
    hexId: manor.seat_hex_id,
    q: manor.seat_q,
    r: manor.seat_r,
    countyId: manor.county_id,
    manorId: manor.manor_id,
  };
}

function coverageLabel(manor: CourtOsSpatialManor): string {
  if (manor.detailed_coverage.coverage_state === "authored_one_acre_detail") {
    return `${manor.detailed_coverage.authored_acre_count?.toLocaleString() ?? "Authored"} one-acre cells`;
  }
  return "Recorded at realm scale";
}

function knowledgeLabel(manor: CourtOsSpatialManor): string {
  if (manor.ui_authority) return "Current House estate record";
  if (manor.source_posture === "provisional_read_only") {
    return "Provisional operator crosswalk · not an assignment lock";
  }
  return "Recorded geography · operating detail unavailable";
}

function portfolioIsAdmitted(portfolio: CourtOsSpatialPortfolio): boolean {
  return portfolio.association_posture === "ui_admitted";
}

function SpatialUnavailable({ state }: { state: CourtOsSpatialState }) {
  return (
    <section className="uat-spatial-unavailable" role={state.status === "error" ? "alert" : "status"}>
      <i aria-hidden="true" />
      <small>Estate & Holdings</small>
      <h2>{state.status === "loading" ? "Opening the land record" : "No land portfolio can be shown"}</h2>
      <p>
        {state.status === "loading"
          ? "Joining the selected House to the recorded manor geography."
          : state.status === "error"
            ? state.message
            : "No admitted or provisional operating records resolve to this House. No substitute holdings have been invented."}
      </p>
    </section>
  );
}

function PortfolioRail({
  portfolio,
  selected,
  locked,
  onSelect,
}: {
  portfolio: CourtOsSpatialPortfolio;
  selected: CourtOsSpatialManor;
  locked: boolean;
  onSelect: (manor: CourtOsSpatialManor) => void;
}) {
  return (
    <aside className="uat-spatial-portfolio">
      <header>
        <small>{portfolioIsAdmitted(portfolio) ? "House lands" : "Provisional geography"}</small>
        <h2>{portfolioIsAdmitted(portfolio) ? "Estate & Holdings" : "Estate associations"}</h2>
        <p>
          {portfolio.manors.length} {portfolioIsAdmitted(portfolio)
            ? `admitted ${portfolio.manors.length === 1 ? "holding" : "holdings"}`
            : `provisional ${portfolio.manors.length === 1 ? "association" : "associations"}`}
        </p>
      </header>
      <div className="uat-spatial-manor-list">
        {portfolio.manors.map((manor, index) => (
          <button
            aria-current={manor.manor_id === selected.manor_id ? "true" : undefined}
            disabled={locked}
            key={manor.protected_manor_id}
            onClick={() => onSelect(manor)}
            type="button"
          >
            <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
            <span>
              <strong>{manor.display_name}</strong>
              <small>
                {manor.county_name ?? "County not recorded"} · {manor.hex_count} {manor.hex_count === 1 ? "hex" : "hexes"}
                {manor.ui_authority ? "" : " · provisional"}
              </small>
            </span>
          </button>
        ))}
      </div>
      {!portfolioIsAdmitted(portfolio) ? (
        <footer>
          <strong>Non-authoritative association</strong>
          <span>{portfolio.association_note}</span>
        </footer>
      ) : null}
    </aside>
  );
}

export function EstateHoldingsScene({
  model,
  spatialState,
  mode = "room",
  selectedManorId: controlledSelectedManorId,
  onSelectedManorChange,
  onOpenManorStewardship,
  onReturnToEstate,
}: {
  model: CourtOsShellRuntimeModel;
  spatialState: CourtOsSpatialState;
  mode?: "room" | "manor_stewardship";
  selectedManorId?: string | null;
  onSelectedManorChange?: (manorId: string) => void;
  onOpenManorStewardship: (manor: CourtOsSpatialManor) => void;
  onReturnToEstate?: () => void;
}) {
  const portfolio = spatialState.status === "ready" ? spatialState.portfolio : null;
  const [localSelectedManorId, setLocalSelectedManorId] = useState<string | null>(null);
  const selectedManorId = controlledSelectedManorId ?? localSelectedManorId;
  const [level, setLevel] = useState<CourtOsMapLevel>("realm");
  const [pendingLevel, setPendingLevel] = useState<CourtOsMapLevel | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "preparing" | "crossfading">("idle");
  const [transitionDirection, setTransitionDirection] = useState<"in" | "out">("in");
  const [viewerState, setViewerState] = useState<"loading" | "ready" | "delayed" | "error">("loading");
  const [viewerFailure, setViewerFailure] = useState<{ message: string; recoverable: boolean } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const incomingFrame = useRef<HTMLIFrameElement | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const arrivedLevelRef = useRef<CourtOsMapLevel | null>(null);
  const selected =
    portfolio?.manors.find((manor) => manor.manor_id === selectedManorId) ??
    portfolio?.manors[0] ??
    null;
  const rendererKey = selected?.detailed_coverage.renderers[level] ?? null;
  const src = useMemo(() => {
    if (!rendererKey || !MAPGEN_BASE_URL) return null;
    const url = rendererUrl({
      baseUrl: MAPGEN_BASE_URL,
      rendererKey,
      parentOrigin: window.location.origin,
    });
    if (reloadToken) url.searchParams.set("reload", String(reloadToken));
    return url.toString();
  }, [rendererKey, reloadToken]);
  const incomingRendererKey = pendingLevel
    ? selected?.detailed_coverage.renderers[pendingLevel] ?? null
    : null;
  const incomingSrc = useMemo(() => {
    if (!incomingRendererKey || !MAPGEN_BASE_URL) return null;
    return rendererUrl({
      baseUrl: MAPGEN_BASE_URL,
      rendererKey: incomingRendererKey,
      parentOrigin: window.location.origin,
    }).toString();
  }, [incomingRendererKey]);

  function postTo(
    targetFrame: HTMLIFrameElement | null,
    targetSrc: string | null,
    message: Record<string, unknown>,
  ) {
    const target = targetFrame?.contentWindow;
    if (!target || !targetSrc) return;
    target.postMessage(message, new URL(targetSrc).origin);
  }

  function post(message: Record<string, unknown>) {
    postTo(frame.current, src, message);
  }

  function sendContext(
    nextLevel = level,
    nextSelected = selected,
    targetFrame = frame.current,
    targetSrc = src,
  ) {
    if (!portfolio || !nextSelected) return;
    postTo(targetFrame, targetSrc, {
      type: "merecross:spatial:init:v1",
      payload: {
        lens: "manor_operations",
        asOf: spatialState.status === "ready" ? spatialState.effectiveDate : model.effectiveDate,
        house: { id: portfolio.house_id, name: portfolio.house_name },
        level: nextLevel,
        themeId: COURTOS_CARTOGRAPHY_THEME_ID,
        focus: manorFocus(nextSelected),
        manors: portfolio.manors.map((manor) => ({
          id: manor.manor_id,
          protectedId: manor.protected_manor_id,
          name: manor.display_name,
          countyId: manor.county_id,
          countyName: manor.county_name,
          q: manor.seat_q,
          r: manor.seat_r,
          hexId: manor.seat_hex_id,
          coverage: manor.detailed_coverage.coverage_state,
          sourcePosture: manor.source_posture,
          sourceStatus: manor.source_status,
          uiAuthority: manor.ui_authority,
        })),
      },
    });
  }

  useEffect(() => {
    if (!src || !rendererKey) return;
    const onMessage = (event: MessageEvent) => {
      const fromCurrent = event.source === frame.current?.contentWindow;
      const fromIncoming = event.source === incomingFrame.current?.contentWindow;
      if (!fromCurrent && !fromIncoming) return;
      const expectedSrc = fromIncoming ? incomingSrc : src;
      const expectedRendererKey = fromIncoming ? incomingRendererKey : rendererKey;
      if (!expectedSrc || event.origin !== new URL(expectedSrc).origin) return;
      if (event.data?.type === "merecross:spatial:ready:v1") {
        if (isSpatialReadyMessage(event.data) && event.data.payload.rendererKey === expectedRendererKey) {
          setViewerFailure(null);
          if (fromIncoming && pendingLevel) {
            sendContext(pendingLevel, selected, incomingFrame.current, incomingSrc);
            setTransitionPhase("crossfading");
            if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
            const nextArrivedLevel = pendingLevel;
            transitionTimer.current = window.setTimeout(() => {
              arrivedLevelRef.current = nextArrivedLevel;
              setLevel(nextArrivedLevel);
              setPendingLevel(null);
              setTransitionPhase("idle");
              setViewerState("ready");
              transitionTimer.current = null;
            }, 920);
          } else {
            setViewerState("ready");
            sendContext();
          }
        } else {
          setViewerFailure({
            message: "The terrain renderer returned an incompatible readiness contract.",
            recoverable: false,
          });
          setViewerState("error");
        }
      } else if (event.data?.type === "merecross:spatial:error:v1") {
        const payload = event.data?.payload;
        if (payload?.rendererKey === expectedRendererKey) {
          if (fromIncoming) {
            setPendingLevel(null);
            setTransitionPhase("idle");
          }
          setViewerFailure({
            message: typeof payload?.message === "string"
              ? payload.message
              : "The terrain renderer could not prepare a usable survey.",
            recoverable: true,
          });
          setViewerState("error");
        }
      } else if (
        event.data?.type === "merecross:spatial:selection:v1" ||
        event.data?.type === "merecross:focus"
      ) {
        const payload = event.data?.payload ?? event.data;
        const focus = payload?.focus ?? payload;
        const manorId = focus?.manorId ?? focus?.manor_id;
        if (typeof manorId === "string" && portfolio?.manors.some((manor) => manor.manor_id === manorId)) {
          setLocalSelectedManorId(manorId);
          onSelectedManorChange?.(manorId);
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [src, rendererKey, incomingSrc, incomingRendererKey, portfolio, level, pendingLevel, selectedManorId]);

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
  }, []);

  useEffect(() => {
    if (!MAPGEN_BASE_URL) {
      setViewerFailure({
        message: "The MapGen runtime is not configured for this build.",
        recoverable: false,
      });
      setViewerState("error");
      return;
    }
    if (!rendererKey || !src) {
      setViewerFailure({
        message: `No admitted ${level} renderer is mapped for this geographic record.`,
        recoverable: false,
      });
      setViewerState("error");
      return;
    }
    if (arrivedLevelRef.current === level) {
      arrivedLevelRef.current = null;
      setViewerState("ready");
      return;
    }
    setViewerFailure(null);
    setViewerState("loading");
    const timeout = window.setTimeout(() => {
      setViewerState((current) => current === "ready" ? current : "delayed");
    }, VIEWER_READY_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [src, rendererKey, level]);

  useEffect(() => {
    if (viewerState === "ready") sendContext();
  }, [viewerState, level, selectedManorId, portfolio]);

  if (spatialState.status !== "ready" || !portfolio || !selected) {
    return <SpatialUnavailable state={spatialState} />;
  }

  function selectManor(manor: CourtOsSpatialManor) {
    if (transitionPhase !== "idle") return;
    setLocalSelectedManorId(manor.manor_id);
    onSelectedManorChange?.(manor.manor_id);
    if (
      (level === "estate" && manor.detailed_coverage.coverage_state !== "authored_one_acre_detail") ||
      (level === "county" && !manor.detailed_coverage.available_levels.includes("county"))
    ) {
      setLevel("realm");
    }
    post({ type: "merecross:spatial:focus:v1", payload: manorFocus(manor) });
  }

  function chooseLevel(next: CourtOsMapLevel) {
    if (next === level || transitionPhase !== "idle") return;
    const order: Record<CourtOsMapLevel, number> = { realm: 0, county: 1, estate: 2 };
    setTransitionDirection(order[next] > order[level] ? "in" : "out");
    setPendingLevel(next);
    setTransitionPhase("preparing");
  }

  const canOpenCounty = selected.detailed_coverage.available_levels.includes("county");
  const canOpenEstate = selected.detailed_coverage.available_levels.includes("estate");

  return (
    <section
      className="uat-scene uat-spatial-scene"
      data-mode={mode}
      data-transition-direction={transitionDirection}
      data-transition-phase={transitionPhase}
      aria-busy={transitionPhase !== "idle"}
      aria-label={mode === "room" ? "Estate and Holdings" : "Manor Stewardship"}
    >
      {src ? (
        <iframe
          key={src}
          ref={frame}
          className="uat-spatial-frame uat-spatial-frame-current"
          referrerPolicy="strict-origin"
          sandbox="allow-same-origin allow-scripts"
          src={src}
          title={`${level === "realm" ? "Estate survey" : level === "county" ? "Jurisdictional survey" : "Detailed ground plan"} for ${model.house.displayName}`}
          onError={() => {
            setViewerFailure({ message: "The MapGen runtime could not be reached.", recoverable: true });
            setViewerState("error");
          }}
        />
      ) : null}
      {incomingSrc && pendingLevel ? (
        <iframe
          key={incomingSrc}
          ref={incomingFrame}
          className="uat-spatial-frame uat-spatial-frame-incoming"
          referrerPolicy="strict-origin"
          sandbox="allow-same-origin allow-scripts"
          src={incomingSrc}
          title={`${pendingLevel === "realm" ? "Estate survey" : pendingLevel === "county" ? "Jurisdictional survey" : "Detailed ground plan"} for ${model.house.displayName}`}
          onError={() => {
            setPendingLevel(null);
            setTransitionPhase("idle");
            setViewerFailure({ message: "The next geographic scale could not be reached.", recoverable: true });
          }}
        />
      ) : null}
      <div className="uat-spatial-vignette" aria-hidden="true" />
      {mode === "room" ? (
        <PortfolioRail
          portfolio={portfolio}
          selected={selected}
          locked={transitionPhase !== "idle"}
          onSelect={selectManor}
        />
      ) : (
        <aside className="uat-manor-scope-rail">
          <header>
            <small>Estate & Holdings</small>
            <h2>Manor Stewardship</h2>
          </header>
          {portfolio.manors.map((manor) => (
            <button
              aria-current={manor.manor_id === selected.manor_id ? "page" : undefined}
              disabled={transitionPhase !== "idle"}
              key={manor.protected_manor_id}
              onClick={() => selectManor(manor)}
              type="button"
            >
              <strong>{manor.display_name}</strong>
              <small>{manor.county_name ?? "County not recorded"}</small>
            </button>
          ))}
          <button className="uat-manor-return" onClick={onReturnToEstate} type="button">
            Return to Estate & Holdings
          </button>
        </aside>
      )}
      <nav className="uat-spatial-levels" aria-label="Map scale">
        <button aria-pressed={(pendingLevel ?? level) === "realm"} disabled={transitionPhase !== "idle"} onClick={() => chooseLevel("realm")} type="button">
          {portfolioIsAdmitted(portfolio) ? "House lands" : "Associated lands"}
        </button>
        <button aria-pressed={(pendingLevel ?? level) === "county"} disabled={!canOpenCounty || transitionPhase !== "idle"} onClick={() => chooseLevel("county")} type="button">County</button>
        <button aria-pressed={(pendingLevel ?? level) === "estate"} disabled={!canOpenEstate || transitionPhase !== "idle"} onClick={() => chooseLevel("estate")} type="button">Manor</button>
        <button
          className="uat-spatial-north"
          disabled={viewerState !== "ready" || transitionPhase !== "idle"}
          onClick={() => post({ type: "merecross:spatial:reset-north:v1", payload: { level } })}
          type="button"
        >
          North
        </button>
      </nav>
      {pendingLevel ? (
        <div className="uat-spatial-transition" role="status" aria-live="polite">
          <div className="uat-spatial-transition-route" aria-hidden="true">
            <i /><span /><i />
          </div>
          <small>{transitionPhase === "preparing" ? "Consulting the next survey" : "Geography held in continuity"}</small>
          <strong>
            {transitionDirection === "in" ? "Descending into" : "Returning to"}{" "}
            {pendingLevel === "realm" ? "the House lands" : pendingLevel === "county" ? selected.county_name ?? "the county" : selected.display_name}
          </strong>
        </div>
      ) : null}
      {mode === "room" ? <article className="uat-spatial-orientation">
        <header>
          <small>{knowledgeLabel(selected)}</small>
          <h2>{selected.display_name}</h2>
          <span>{selected.county_name ?? "County not recorded"}</span>
        </header>
        <dl>
          <div><dt>Extent</dt><dd>{selected.hex_count} map hexes</dd></div>
          <div><dt>Households</dt><dd>{selected.estimated_peasant_households?.toLocaleString() ?? "Not disclosed"}</dd></div>
          <div><dt>Detail</dt><dd>{coverageLabel(selected)}</dd></div>
        </dl>
        <p>
          {canOpenEstate
            ? "Recorded grounds are available for spatial review. A visit, report, or inspection remains a separate commitment."
            : "Detailed grounds are not present in the current House record."}
        </p>
        <div className="uat-spatial-orientation-actions">
          <button onClick={() => onOpenManorStewardship(selected)} type="button">
            Open Manor Stewardship
          </button>
          <button disabled={!canOpenEstate || level === "estate" || transitionPhase !== "idle"} onClick={() => chooseLevel("estate")} type="button">
            {level === "estate"
              ? "Recorded grounds open"
              : canOpenEstate
                ? "Review recorded grounds"
                : "Ground record unavailable"}
          </button>
        </div>
      </article> : (
        <article className="uat-manor-workspace">
          <header>
            <div>
              <small>Manor Stewardship · exact manor scope</small>
              <h2>{selected.display_name}</h2>
              <p>{selected.county_name ?? "County not recorded"}</p>
            </div>
            <span data-state={selected.ui_authority ? "available" : "unavailable"}>
              {selected.ui_authority ? "House operating record" : "Operating account unavailable"}
            </span>
          </header>
          <div className="uat-manor-workspace-body">
            <main>
              <section className="uat-manor-current-state">
                <header><small>Current state</small><h3>The recorded manor</h3></header>
                <dl>
                  <div><dt>Recorded extent</dt><dd>{selected.hex_count} map hexes</dd></div>
                  <div><dt>Households</dt><dd>{selected.estimated_peasant_households?.toLocaleString() ?? "Not disclosed"}</dd></div>
                  <div><dt>Ground record</dt><dd>{coverageLabel(selected)}</dd></div>
                  <div><dt>Accountable owner</dt><dd>{selected.ui_authority ? "Named in the operating record" : "No admitted assignment"}</dd></div>
                </dl>
                <p>
                  Geography or estimated extent does not establish current condition,
                  custody, completed work, or direct inspection.
                </p>
              </section>
              <section className="uat-manor-workspace-section">
                <small>Matters</small>
                <h3>No admitted Manor Stewardship Matter</h3>
                <p>No exception or decision need is invented from geographic coverage alone.</p>
              </section>
              <section className="uat-manor-workspace-section">
                <small>Last cycle</small>
                <h3>No responsible-party report available</h3>
                <p>The spatial record is not a substitute for the steward's triennial account.</p>
              </section>
            </main>
            <aside>
              <section>
                <small>Accountability</small>
                <span className="uat-manor-empty-portrait" aria-hidden="true" />
                <strong>{selected.ui_authority ? "Recorded manor operator" : "No admitted assignment"}</strong>
                <p>Assignment, authority, and support require the responsibility workspace projection.</p>
              </section>
              <section>
                <small>Available review</small>
                <button disabled={!canOpenEstate || transitionPhase !== "idle"} onClick={() => chooseLevel("estate")} type="button">
                  {canOpenEstate ? "Review recorded grounds" : "Ground record unavailable"}
                </button>
                <p>A visit, report request, summons, or commissioned inspection is a separate future action.</p>
              </section>
            </aside>
          </div>
        </article>
      )}
      {viewerState !== "ready" ? (
        <div className="uat-spatial-loading" role={viewerState === "error" ? "alert" : "status"}>
          <span className="uat-spatial-record-ticks" aria-hidden="true"><i /><i /><i /></span>
          <strong>
            {viewerState === "loading"
              ? "Composing the recorded geography…"
              : viewerState === "delayed"
                ? "The survey surface is taking longer than expected."
                : viewerFailure?.message ?? "The survey surface could not be opened."}
          </strong>
          {viewerState !== "loading" && (viewerState === "delayed" || viewerFailure?.recoverable) ? (
            <button onClick={() => setReloadToken((value) => value + 1)} type="button">Try the survey again</button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** @deprecated Use EstateHoldingsScene. Retained only for source compatibility. */
export const ManorOperationsScene = EstateHoldingsScene;

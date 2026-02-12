import React, { useMemo, useState } from "react";
import { APP_VERSION } from "./version";
import { createNewRun, proposeTurn, applyDecisions } from "./sim";
import type { GameOverState, RunState, TurnDecisions } from "./sim/types";
import { buildRunSummary } from "./sim/exports";
import { IMPROVEMENT_IDS, IMPROVEMENTS } from "./content/improvements";
import {
  BUILD_RATE_PER_BUILDER_PER_TURN,
  BUILDER_EXTRA_BUSHELS_PER_YEAR,
  BUSHELS_PER_PERSON_PER_YEAR,
  TURN_YEARS,
  UNREST_ARREARS_PENALTY
} from "./sim/constants";

type Screen = "new" | "play" | "log";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtSigned(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "0";
}

function Tip({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      style={{
        cursor: "help",
        marginLeft: 6,
        opacity: 0.75,
        userSelect: "none",
        border: "1px solid #bbb",
        borderRadius: 999,
        padding: "0px 6px",
        fontSize: 12
      }}
    >
      ⓘ
    </span>
  );
}

function splitWhyNotes(notes: string[]): { player: string[]; debug: string[] } {
  const player: string[] = [];
  const debug: string[] = [];
  for (const n of notes) {
    if (n.startsWith("Selected from") || n.startsWith("Weight≈")) debug.push(n);
    else player.push(n);
  }
  return { player, debug };
}

const GAME_OVER_REASON_COPY: Record<GameOverState["reason"], string> = {
  Dispossessed: "Dispossessed (Unrest ≥ 100 at end of turn)",
  DeathNoHeir: "Death with no valid heir (game over)"
};

const defaultDecisions: TurnDecisions = {
  labor: { kind: "labor", desired_farmers: 28, desired_builders: 0 },
  sell: { kind: "sell", sell_bushels: 0 },
  obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
  construction: { kind: "construction", action: "none" },
  marriage: { kind: "marriage", action: "none" }
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("new");
  const [seed, setSeed] = useState<string>(() => `run_${Math.random().toString(36).slice(2, 10)}`);
  const [state, setState] = useState<RunState | null>(null);
  const [decisions, setDecisions] = useState<TurnDecisions>(defaultDecisions);

  const ctx = useMemo(() => (state ? proposeTurn(state) : null), [state]);

  function newRun() {
    const s = createNewRun(seed.trim() || `run_${Date.now()}`);
    setState(s);
    setDecisions({
      ...defaultDecisions,
      labor: { kind: "labor", desired_farmers: s.manor.farmers, desired_builders: s.manor.builders }
    });
    setScreen("play");
  }

  function advanceTurn() {
    if (!state) return;
    const next = applyDecisions(state, decisions);
    setState(next);
    if (!next.game_over) {
      setDecisions((d) => ({
        ...d,
        labor: { kind: "labor", desired_farmers: next.manor.farmers, desired_builders: next.manor.builders },
        construction: { kind: "construction", action: "none" },
        marriage: { kind: "marriage", action: "none" }
      }));
    }
  }

  if (screen === "new") {
    return (
      <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 900 }}>
        <h1>Lords of the Manor — MVP ({APP_VERSION})</h1>
        <p>Deterministic, seeded prototype. Turn = {TURN_YEARS} years.</p>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label>Seed:</label>
          <input value={seed} onChange={(e) => setSeed(e.target.value)} style={{ width: 360 }} />
          <button onClick={() => setSeed(`run_${Date.now()}`)}>Generate</button>
          <button onClick={newRun}>New Run</button>
        </div>

        <p style={{ marginTop: 12, opacity: 0.8 }}>
          Note: Same seed + same decisions ⇒ identical results (no Math.random in sim).
        </p>
      </div>
    );
  }

  if (!state || !ctx) return null;

  if (screen === "log") {
    return (
      <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 1100 }}>
        <h2>Run Log</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setScreen("play")}>Back</button>
          <button onClick={() => downloadJson(`run_export_${state.run_seed}.json`, state)}>Export Full Run JSON</button>
          <button onClick={() => downloadJson(`run_summary_${state.run_seed}.json`, buildRunSummary(state))}>Export Run Summary</button>
        </div>

        <p style={{ opacity: 0.8 }}>
          {state.log.length} turns logged. Game over: {state.game_over ? state.game_over.reason : "no"}.
        </p>

        <pre style={{ background: "#111", color: "#eee", padding: 12, overflow: "auto", maxHeight: 600 }}>
          {JSON.stringify(
            state.log.map((t) => ({
              turn: t.processed_turn_index,
              summary: t.summary,
              top_drivers: t.report.top_drivers,
              events: t.report.events.map((e) => ({
                id: e.id,
                title: e.title,
                why: e.why.notes,
                effects: e.effects,
                deltas: e.deltas
              }))
            })),
            null,
            2
          )}
        </pre>
      </div>
    );
  }

  // play screen
  const m = ctx.preview_state.manor;
  const ob = ctx.preview_state.manor.obligations;
  const mw = ctx.marriage_window;

  const beforeM = state.manor;

  const deltaPop = m.population - beforeM.population;
  const deltaBushels = m.bushels_stored - beforeM.bushels_stored;
  const deltaCoin = m.coin - beforeM.coin;
  const deltaUnrest = m.unrest - beforeM.unrest;

  const baselineConsPerTurn = BUSHELS_PER_PERSON_PER_YEAR * TURN_YEARS;
  const builderExtraPerTurn = BUILDER_EXTRA_BUSHELS_PER_YEAR * TURN_YEARS;
  const builderConsPerTurn = baselineConsPerTurn + builderExtraPerTurn;

  const idle = Math.max(0, m.population - m.farmers - m.builders);

  const hasArrears = ob.arrears.coin > 0 || ob.arrears.bushels > 0;

  const constructionRateThisTurn = m.builders * BUILD_RATE_PER_BUILDER_PER_TURN;
  const constructionRatePlannedNextTurn = decisions.labor.desired_builders * BUILD_RATE_PER_BUILDER_PER_TURN;
  const constructionRemaining = m.construction ? Math.max(0, m.construction.required - m.construction.progress) : 0;
  const constructionEtaTurns =
    m.construction && constructionRateThisTurn > 0 ? Math.ceil(constructionRemaining / constructionRateThisTurn) : null;

  const consFarmers = m.farmers * baselineConsPerTurn;
  const consBuilders = m.builders * builderConsPerTurn;
  const consIdle = idle * baselineConsPerTurn;

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2>Turn {ctx.report.turn_index}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setScreen("new")}>New Run</button>
          <button onClick={() => setScreen("log")}>Debug/Log</button>
        </div>
      </div>

      {state.game_over ? (
        <div style={{ padding: 12, border: "1px solid #f55", marginBottom: 12 }}>
          <b>GAME OVER:</b> {GAME_OVER_REASON_COPY[state.game_over.reason]} — Turn {state.game_over.turn_index}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ padding: 12, border: "1px solid #ccc" }}>
          <h3>
            Manor State <span style={{ fontSize: 12, opacity: 0.7 }}>(before decisions)</span>
          </h3>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
            Turn = {TURN_YEARS} years. This includes harvest/spoilage/events that already happened this turn; your choices below still
            affect the end-of-turn outcome.
          </div>

          <ul>
            <li>
              Population: {m.population} {deltaPop !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaPop)})</span> : null}
            </li>
            <li>Farmers: {m.farmers}</li>
            <li>
              Builders: {m.builders}
              <Tip
                text={`Builder food premium: each builder consumes +${builderExtraPerTurn} bushels/turn (turn=${TURN_YEARS}y) compared to a farmer/idle worker.`}
              />
            </li>
            <li>
              Bushels stored: {m.bushels_stored}{" "}
              {deltaBushels !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaBushels)})</span> : null}
            </li>
            <li>
              Coin: {m.coin} {deltaCoin !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaCoin)})</span> : null}
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>
                Unrest: <b>{m.unrest}</b>/100 {deltaUnrest !== 0 ? <span style={{ opacity: 0.75 }}>(Δ {fmtSigned(deltaUnrest)})</span> : null}
              </span>
              <progress value={m.unrest} max={100} style={{ width: 180, height: 14 }} />
              <Tip text="If Unrest is ≥ 100 at end of a turn, you are Dispossessed (game over)." />
            </li>
          </ul>

          <h4>Construction</h4>
          {ctx.report.construction.completed_improvement_id ? (
            <div style={{ padding: 8, border: "1px solid #cfc", marginBottom: 8 }}>
              Completed: <b>{IMPROVEMENTS[ctx.report.construction.completed_improvement_id]?.name ?? ctx.report.construction.completed_improvement_id}</b>
            </div>
          ) : null}

          {m.construction ? (
            <div>
              <div>
                Active: <b>{IMPROVEMENTS[m.construction.improvement_id]?.name ?? m.construction.improvement_id}</b>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                <span>
                  Progress: {m.construction.progress}/{m.construction.required}
                </span>
                <progress value={m.construction.progress} max={m.construction.required} style={{ width: 200, height: 14 }} />
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                This turn’s progress: +{ctx.report.construction.progress_added} (rate {m.builders} builders × {BUILD_RATE_PER_BUILDER_PER_TURN} = {constructionRateThisTurn}/turn)
                <Tip text="Construction progress uses CURRENT builders. Changing builders below affects NEXT turn." />
              </div>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                {constructionRateThisTurn > 0 ? (
                  <span>
                    Estimated time remaining at current rate: ~{constructionEtaTurns} turn{constructionEtaTurns === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span>
                    No progress while builders = 0.
                    <Tip text="Assign builders (next turn) to keep construction moving." />
                  </span>
                )}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                Planned next turn: {decisions.labor.desired_builders} builders → ~{constructionRatePlannedNextTurn} progress/turn
              </div>

              <button
                onClick={() => setDecisions((d) => ({ ...d, construction: { kind: "construction", action: "abandon", confirm: true } }))}
                title="Abandon loses all progress; coin is not refunded."
                style={{ marginTop: 8 }}
              >
                Abandon Project (lossy)
              </button>
            </div>
          ) : (
            <div>None</div>
          )}
        </div>

        <div style={{ padding: 12, border: "1px solid #ccc" }}>
          <h3>
            Turn Report <span style={{ fontSize: 12, opacity: 0.7 }}>(before decisions)</span>
          </h3>

          <div style={{ padding: 8, border: "1px solid #eee", background: "#fafafa", marginBottom: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>At a glance</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
              <div>
                Bushels: <b>{fmtSigned(deltaBushels)}</b> (now {m.bushels_stored})
              </div>
              <div>
                Coin: <b>{fmtSigned(deltaCoin)}</b> (now {m.coin})
              </div>
              <div>
                Unrest: <b>{fmtSigned(deltaUnrest)}</b> (now {m.unrest}/100)
              </div>
              {ctx.report.shortage_bushels > 0 ? (
                <div>
                  <b>Shortage:</b> {ctx.report.shortage_bushels} bushels
                </div>
              ) : null}
            </div>
          </div>

          <h4>Top drivers (3)</h4>
          {ctx.report.top_drivers.length ? (
            <ol>
              {ctx.report.top_drivers.slice(0, 3).map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ol>
          ) : (
            <div style={{ opacity: 0.7 }}>None</div>
          )}

          <h4>Food & stores</h4>
          <ul>
            <li>Weather multiplier: {ctx.report.weather_multiplier.toFixed(2)}</li>
            <li>Production: +{ctx.report.production_bushels} bushels</li>
            <li>
              Consumption: -{ctx.report.consumption_bushels} bushels
              <Tip
                text={`Baseline consumption: ${baselineConsPerTurn} bushels/turn per person. Builders cost +${builderExtraPerTurn} extra bushels/turn each (turn=${TURN_YEARS}y).`}
              />
            </li>
            <li>
              Spoilage: -{ctx.report.spoilage.loss_bushels} bushels ({(ctx.report.spoilage.rate * 100).toFixed(1)}%)
            </li>
          </ul>

          <details style={{ marginTop: 6 }}>
            <summary>Consumption breakdown</summary>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
              <ul>
                <li>
                  Farmers: {m.farmers} × {baselineConsPerTurn} = {consFarmers} bushels/turn
                </li>
                <li>
                  Builders: {m.builders} × {builderConsPerTurn} = {consBuilders} bushels/turn
                </li>
                <li>
                  Idle: {idle} × {baselineConsPerTurn} = {consIdle} bushels/turn
                </li>
                <li>
                  Total: {consFarmers + consBuilders + consIdle} bushels/turn
                </li>
              </ul>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Builder premium: +{builderExtraPerTurn} bushels/turn <b>per builder</b>.
              </div>
            </div>
          </details>

          <h4 style={{ marginTop: 12 }}>Market</h4>
          <ul>
            <li>
              Price: {ctx.report.market.price_per_bushel.toFixed(2)} coin/bushel
            </li>
            <li>
              Sell cap: {ctx.report.market.sell_cap_bushels} bushels
              <Tip text="Selling consumes 1 energy. Amount is trimmed to the market cap." />
            </li>
          </ul>

          <h4 style={{ marginTop: 12 }}>Obligations</h4>
          <ul>
            <li>Tax due: {ob.tax_due_coin} coin</li>
            <li>Tithe due: {ob.tithe_due_bushels} bushels</li>
            <li>
              Arrears outstanding: {ob.arrears.coin} coin / {ob.arrears.bushels} bushels
              <Tip
                text={`Timing: unpaid dues become arrears at end of the turn. If arrears > 0 when a turn starts, penalties apply immediately (+${UNREST_ARREARS_PENALTY} unrest/turn) until arrears are cleared.`}
              />
              {hasArrears ? <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.85 }}>(penalty active)</span> : null}
            </li>
          </ul>

          <h4 style={{ marginTop: 12 }}>Events</h4>
          {ctx.report.events.length === 0 ? <div>None</div> : null}
          {ctx.report.events.map((e) => {
            const { player, debug } = splitWhyNotes(e.why.notes);
            return (
              <div key={e.id} style={{ padding: 8, border: "1px solid #ddd", marginBottom: 6 }}>
                <div>
                  <b>{e.title}</b> <span style={{ opacity: 0.7 }}>({e.category})</span>
                </div>

                {player.length ? (
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>
                    <b>Why:</b>
                    <ul style={{ margin: "4px 0 0 18px" }}>
                      {player.map((n, idx) => (
                        <li key={idx}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {debug.length ? (
                  <details style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    <summary>Odds details</summary>
                    <ul style={{ margin: "4px 0 0 18px" }}>
                      {debug.map((n, idx) => (
                        <li key={idx}>{n}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                <ul style={{ marginTop: 6 }}>
                  {e.effects.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {!state.game_over ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #ccc" }}>
          <h3>Decisions (3–5)</h3>
          <p style={{ opacity: 0.8 }}>
            Energy available: {ctx.preview_state.house.energy.available}/{ctx.preview_state.house.energy.max}. Labor plan affects <b>next</b> turn.
            Max labor shift this turn: <b>{ctx.max_labor_shift}</b>.
          </p>

          {/* Labor */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <label>Farmers (next turn): </label>
              <input
                type="number"
                value={decisions.labor.desired_farmers}
                onChange={(e) =>
                  setDecisions((d) => ({ ...d, labor: { ...d.labor, desired_farmers: Number(e.target.value) } }))
                }
                style={{ width: 80 }}
              />
            </div>
            <div>
              <label>
                Builders (next turn):
                <Tip
                  text={`Builders add construction progress next turn (rate = builders × ${BUILD_RATE_PER_BUILDER_PER_TURN}). They also consume +${builderExtraPerTurn} extra bushels/turn each (turn=${TURN_YEARS}y).`}
                />
                {" "}
              </label>
              <input
                type="number"
                value={decisions.labor.desired_builders}
                onChange={(e) =>
                  setDecisions((d) => ({ ...d, labor: { ...d.labor, desired_builders: Number(e.target.value) } }))
                }
                style={{ width: 80 }}
              />
            </div>

            {/* Sell */}
            <div>
              <label>Sell bushels: </label>
              <input
                type="number"
                value={decisions.sell.sell_bushels}
                onChange={(e) => setDecisions((d) => ({ ...d, sell: { ...d.sell, sell_bushels: Number(e.target.value) } }))}
                style={{ width: 100 }}
              />
              <span style={{ opacity: 0.8 }}> (cap {ctx.report.market.sell_cap_bushels})</span>
            </div>

            {/* Pay obligations */}
            <div>
              <label>
                Pay coin:
                <Tip text="Payments apply to arrears first, then this turn’s dues (tax/tithe). Unpaid dues become arrears at end of turn." />
                {" "}
              </label>
              <input
                type="number"
                value={decisions.obligations.pay_coin}
                onChange={(e) =>
                  setDecisions((d) => ({ ...d, obligations: { ...d.obligations, pay_coin: Number(e.target.value) } }))
                }
                style={{ width: 80 }}
              />
            </div>
            <div>
              <label>Pay bushels: </label>
              <input
                type="number"
                value={decisions.obligations.pay_bushels}
                onChange={(e) =>
                  setDecisions((d) => ({ ...d, obligations: { ...d.obligations, pay_bushels: Number(e.target.value) } }))
                }
                style={{ width: 90 }}
              />
            </div>

            {/* War levy */}
            {ob.war_levy_due ? (
              <div>
                <label>War levy: </label>
                <select
                  value={decisions.obligations.war_levy_choice ?? "ignore"}
                  onChange={(e) =>
                    setDecisions((d) => ({ ...d, obligations: { ...d.obligations, war_levy_choice: e.target.value as any } }))
                  }
                >
                  <option value="coin">Pay coin</option>
                  <option value="men">Provide men</option>
                  <option value="ignore">Refuse</option>
                </select>
                <span style={{ opacity: 0.8, marginLeft: 8 }}>
                  Due: {ob.war_levy_due.kind === "men_or_coin" ? `${ob.war_levy_due.men} men OR ${ob.war_levy_due.coin} coin` : ""}
                </span>
              </div>
            ) : null}
          </div>

          {/* Construction */}
          <div style={{ marginTop: 10 }}>
            <h4>Improvement slot</h4>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                disabled={Boolean(m.construction)}
                title={m.construction ? "Disallowed while a project is active (must abandon first)." : "Pick an improvement to start."}
                onChange={(e) =>
                  setDecisions((d) => ({ ...d, construction: { kind: "construction", action: "start", improvement_id: e.target.value } }))
                }
                defaultValue=""
              >
                <option value="" disabled>
                  Select project…
                </option>
                {IMPROVEMENT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {IMPROVEMENTS[id].name} (coin {IMPROVEMENTS[id].coin_cost}, req {IMPROVEMENTS[id].required})
                  </option>
                ))}
              </select>
              <button onClick={() => setDecisions((d) => ({ ...d, construction: { kind: "construction", action: "none" } }))}>Clear</button>
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
              Construction is <b>not instant</b>. Progress each turn = builders × {BUILD_RATE_PER_BUILDER_PER_TURN}. Builders also consume +{builderExtraPerTurn} extra bushels/turn each.
            </div>
          </div>

          {/* Marriage */}
          {mw ? (
            <div style={{ marginTop: 10 }}>
              <h4>Marriage Window</h4>
              <div style={{ opacity: 0.85 }}>Eligible children: {mw.eligible_child_ids.join(", ")}</div>
              {mw.offers.map((o, idx) => (
                <div key={idx} style={{ padding: 8, border: "1px solid #ddd", marginTop: 6 }}>
                  <b>{o.house_label}</b> — Dowry {o.dowry_coin_net >= 0 ? "+" : ""}
                  {o.dowry_coin_net} coin — tags: {o.risk_tags.join(", ")}
                  <div style={{ marginTop: 6 }}>
                    <button
                      disabled={o.dowry_coin_net < 0 && m.coin < Math.abs(o.dowry_coin_net)}
                      onClick={() =>
                        setDecisions((d) => ({
                          ...d,
                          marriage: { kind: "marriage", action: "accept", child_id: mw.eligible_child_ids[0], offer_index: idx }
                        }))
                      }
                      title={o.dowry_coin_net < 0 && m.coin < Math.abs(o.dowry_coin_net) ? "Insufficient coin for negative dowry (disabled)." : ""}
                    >
                      Choose this offer
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => setDecisions((d) => ({ ...d, marriage: { kind: "marriage", action: "reject_all" } }))}>Reject all</button>
                <button onClick={() => setDecisions((d) => ({ ...d, marriage: { kind: "marriage", action: "scout" } }))}>Scout</button>
                <button onClick={() => setDecisions((d) => ({ ...d, marriage: { kind: "marriage", action: "none" } }))}>Clear</button>
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={advanceTurn}>Advance Turn</button>
            <button onClick={() => downloadJson(`run_summary_${state.run_seed}.json`, buildRunSummary(state))}>Export Run Summary</button>
            <button onClick={() => downloadJson(`run_export_${state.run_seed}.json`, state)}>Export Full Run JSON</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import {
  ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS,
  type EconomyPortfolioOutlierMetricKeyV1
} from "../economy/portfolioRegistry"
import { buildEconomyPortfolioAnalysisFromState } from "../economy/portfolioAnalysis"
import { buildEconomyObligationsView } from "../experience/obligationsView"
import type { ProspectsWindow, RunState } from "../../types"
import { buildCourtDelegationView } from "./delegationRegistry"
import {
  ensureCourtOfficeRegistry,
  ensureCourtServiceRecordRegistry,
  resolveCourtServicePlacementTarget
} from "./officeRegistry"

export const COURT_AGENDA_REGISTRY_SCHEMA_VERSION = "court_agenda_registry_v0" as const
export const COURT_AGENDA_ITEM_SCHEMA_VERSION = "court_agenda_item_v0" as const
export const COURT_AGENDA_SOURCE_MAPPING_SCHEMA_VERSION = "court_agenda_source_mapping_v0" as const
export const COURT_AGENDA_ITEM_LIMIT = 5 as const

export const COURT_AGENDA_SOURCE_TAGS = [
  "obligations",
  "prospects",
  "offices",
  "portfolio_outliers"
] as const

export const COURT_AGENDA_SUMMARY_KINDS = [
  "counterparty_summary",
  "prospect_window",
  "office_registry",
  "portfolio_outlier"
] as const

export const COURT_AGENDA_OBLIGATION_SOURCE_KEYS = [
  "obligations.current_due",
  "obligations.arrears",
  "obligations.enforcement"
] as const

export const COURT_AGENDA_PROSPECT_SOURCE_KEYS = [
  "prospects.expiring",
  "prospects.marriage",
  "prospects.grant"
] as const

export const COURT_AGENDA_OFFICE_SOURCE_KEYS = [
  "offices.required_vacancy",
  "offices.delegated_action",
  "offices.active_service_record",
  "offices.realm_holder_transition"
] as const

export const COURT_AGENDA_PORTFOLIO_OUTLIER_SOURCE_KEYS = ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS

export type CourtAgendaSourceTagV0 = (typeof COURT_AGENDA_SOURCE_TAGS)[number]
export type CourtAgendaSummaryKindV0 = (typeof COURT_AGENDA_SUMMARY_KINDS)[number]
export type CourtAgendaObligationSourceKeyV0 = (typeof COURT_AGENDA_OBLIGATION_SOURCE_KEYS)[number]
export type CourtAgendaProspectSourceKeyV0 = (typeof COURT_AGENDA_PROSPECT_SOURCE_KEYS)[number]
export type CourtAgendaOfficeSourceKeyV0 = (typeof COURT_AGENDA_OFFICE_SOURCE_KEYS)[number]
export type CourtAgendaPortfolioOutlierSourceKeyV0 = EconomyPortfolioOutlierMetricKeyV1
export type CourtAgendaSourceKeyV0 =
  | CourtAgendaObligationSourceKeyV0
  | CourtAgendaProspectSourceKeyV0
  | CourtAgendaOfficeSourceKeyV0
  | CourtAgendaPortfolioOutlierSourceKeyV0

export interface CourtAgendaSourceMappingV0 {
  schema_version: typeof COURT_AGENDA_SOURCE_MAPPING_SCHEMA_VERSION
  source_mapping_key: string
  source_tag: CourtAgendaSourceTagV0
  source_key: CourtAgendaSourceKeyV0
  source_path: string
  summary_kind: CourtAgendaSummaryKindV0
}

export interface CourtAgendaItemV0 {
  schema_version: typeof COURT_AGENDA_ITEM_SCHEMA_VERSION
  agenda_item_id: string
  agenda_item_key: string
  source_tag: CourtAgendaSourceTagV0
  source_key: CourtAgendaSourceKeyV0
  source_mapping_key: string
  source_path: string
  summary_kind: CourtAgendaSummaryKindV0
  title_key: string
  summary_key: string
  priority: number
  tie_key: string
  subject_ref_id: string | null
  related_entity_ids: string[]
  note_tags: string[]
}

export interface CourtAgendaRegistryV0 {
  schema_version: typeof COURT_AGENDA_REGISTRY_SCHEMA_VERSION
  source_tags: CourtAgendaSourceTagV0[]
  source_mapping_keys: string[]
  source_mappings_by_key: Record<string, CourtAgendaSourceMappingV0>
  item_ids: string[]
  items_by_id: Record<string, CourtAgendaItemV0>
}

export interface CourtAgendaItemDraftV0 {
  agenda_item_id?: string
  source_mapping_key: string
  title_key?: string
  summary_key?: string
  priority?: number
  tie_key?: string
  subject_ref_id?: string | null
  related_entity_ids?: readonly string[] | null
  note_tags?: readonly string[] | null
}

export interface BuildCourtAgendaRegistryFromStateOptions {
  prospects_window?: ProspectsWindow | null
}

type CourtAgendaSourceDefinition = {
  source_tag: CourtAgendaSourceTagV0
  source_key: CourtAgendaSourceKeyV0
  source_path: string
  summary_kind: CourtAgendaSummaryKindV0
}

function compareText(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function canonicalId(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed.length > 0 ? trimmed : fallback
}

function canonicalOptionalId(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed.length > 0 ? trimmed : null
}

function canonicalStringList(values: readonly string[] | null | undefined): string[] {
  const deduped = new Set<string>()
  for (const value of values ?? []) {
    const canonical = canonicalId(value, "")
    if (canonical.length === 0) continue
    deduped.add(canonical)
  }
  return [...deduped].sort(compareText)
}

function keyToken(value: string): string {
  return encodeURIComponent(value)
}

function buildOrderedRecord<K extends string, V>(keys: readonly K[], valueFor: (key: K) => V): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, valueFor(key)])) as Record<K, V>
}

function sourceDefinitions(): CourtAgendaSourceDefinition[] {
  return [
    {
      source_tag: "obligations",
      source_key: "obligations.current_due",
      source_path: "economy_obligations_view.counterparty_summaries[].due_amount",
      summary_kind: "counterparty_summary"
    },
    {
      source_tag: "obligations",
      source_key: "obligations.arrears",
      source_path: "economy_obligations_view.counterparty_summaries[].arrears_amount",
      summary_kind: "counterparty_summary"
    },
    {
      source_tag: "obligations",
      source_key: "obligations.enforcement",
      source_path: "economy_obligations_view.counterparty_summaries[].enforcement_state",
      summary_kind: "counterparty_summary"
    },
    {
      source_tag: "prospects",
      source_key: "prospects.expiring",
      source_path: "prospects_window.prospects[].expires_turn",
      summary_kind: "prospect_window"
    },
    {
      source_tag: "prospects",
      source_key: "prospects.marriage",
      source_path: "prospects_window.prospects[type=marriage]",
      summary_kind: "prospect_window"
    },
    {
      source_tag: "prospects",
      source_key: "prospects.grant",
      source_path: "prospects_window.prospects[type=grant]",
      summary_kind: "prospect_window"
    },
    {
      source_tag: "offices",
      source_key: "offices.required_vacancy",
      source_path: "house.court_office_registry.vacant_required_seat_ids[]",
      summary_kind: "office_registry"
    },
    {
      source_tag: "offices",
      source_key: "offices.delegated_action",
      source_path: "house.court_delegation_view.active_action_keys[]",
      summary_kind: "office_registry"
    },
    {
      source_tag: "offices",
      source_key: "offices.active_service_record",
      source_path: "house.court_service_record_registry.active_record_ids[]",
      summary_kind: "office_registry"
    },
    {
      source_tag: "offices",
      source_key: "offices.realm_holder_transition",
      source_path: "house.court_office_registry.seats_by_id[scope=realm].last_transition_turn_index",
      summary_kind: "office_registry"
    },
    ...COURT_AGENDA_PORTFOLIO_OUTLIER_SOURCE_KEYS.map((metricKey) => ({
      source_tag: "portfolio_outliers" as const,
      source_key: metricKey,
      source_path: `portfolio.outliers_by_metric.${metricKey}[]`,
      summary_kind: "portfolio_outlier" as const
    }))
  ]
}

export function makeCourtAgendaSourceMappingKey(
  sourceTag: CourtAgendaSourceTagV0,
  sourceKey: CourtAgendaSourceKeyV0
): string {
  return `court_agenda_source:${sourceTag}:${keyToken(canonicalId(sourceKey, "unknown_source"))}`
}

export function makeCourtAgendaItemKey(agendaItemId: string): string {
  return `court_agenda_item:${keyToken(canonicalId(agendaItemId, "unknown_item"))}`
}

export function buildCourtAgendaSourceMappings(): CourtAgendaSourceMappingV0[] {
  return sourceDefinitions().map((definition) => ({
    schema_version: COURT_AGENDA_SOURCE_MAPPING_SCHEMA_VERSION,
    source_mapping_key: makeCourtAgendaSourceMappingKey(definition.source_tag, definition.source_key),
    source_tag: definition.source_tag,
    source_key: definition.source_key,
    source_path: definition.source_path,
    summary_kind: definition.summary_kind
  }))
}

function sourceMappingsByKey(
  sourceMappings: readonly CourtAgendaSourceMappingV0[]
): Record<string, CourtAgendaSourceMappingV0> {
  return Object.fromEntries(sourceMappings.map((mapping) => [mapping.source_mapping_key, mapping]))
}

export function createCourtAgendaItem(
  draft: CourtAgendaItemDraftV0,
  sourceMappings: readonly CourtAgendaSourceMappingV0[] = buildCourtAgendaSourceMappings()
): CourtAgendaItemV0 {
  const mapping = sourceMappingsByKey(sourceMappings)[draft.source_mapping_key]
  if (!mapping) {
    throw new Error(`Unknown court agenda source mapping: ${draft.source_mapping_key}`)
  }

  const agendaItemId = canonicalId(draft.agenda_item_id, `${mapping.source_tag}:${mapping.source_key}`)
  const titleKey = canonicalId(draft.title_key, `${mapping.source_key}.title`)
  const summaryKey = canonicalId(draft.summary_key, `${mapping.source_key}.summary`)
  const priority = Math.trunc(Number.isFinite(draft.priority) ? Number(draft.priority) : 0)
  const tieKey = canonicalId(draft.tie_key, `${mapping.source_tag}:${mapping.source_key}:${agendaItemId}`)

  return {
    schema_version: COURT_AGENDA_ITEM_SCHEMA_VERSION,
    agenda_item_id: agendaItemId,
    agenda_item_key: makeCourtAgendaItemKey(agendaItemId),
    source_tag: mapping.source_tag,
    source_key: mapping.source_key,
    source_mapping_key: mapping.source_mapping_key,
    source_path: mapping.source_path,
    summary_kind: mapping.summary_kind,
    title_key: titleKey,
    summary_key: summaryKey,
    priority,
    tie_key: tieKey,
    subject_ref_id: canonicalOptionalId(draft.subject_ref_id),
    related_entity_ids: canonicalStringList(draft.related_entity_ids),
    note_tags: canonicalStringList(draft.note_tags)
  }
}

function compareAgendaItems(a: CourtAgendaItemV0, b: CourtAgendaItemV0): number {
  if (a.priority !== b.priority) return b.priority - a.priority
  const tieKeyCmp = compareText(a.tie_key, b.tie_key)
  if (tieKeyCmp !== 0) return tieKeyCmp
  return compareText(a.agenda_item_id, b.agenda_item_id)
}

function toCourtAgendaSourceMappingSnapshot(mapping: CourtAgendaSourceMappingV0): CourtAgendaSourceMappingV0 {
  return {
    schema_version: COURT_AGENDA_SOURCE_MAPPING_SCHEMA_VERSION,
    source_mapping_key: mapping.source_mapping_key,
    source_tag: mapping.source_tag,
    source_key: mapping.source_key,
    source_path: mapping.source_path,
    summary_kind: mapping.summary_kind
  }
}

function toCourtAgendaItemSnapshot(item: CourtAgendaItemV0): CourtAgendaItemV0 {
  return {
    schema_version: COURT_AGENDA_ITEM_SCHEMA_VERSION,
    agenda_item_id: canonicalId(item.agenda_item_id, "unknown_item"),
    agenda_item_key: item.agenda_item_key,
    source_tag: item.source_tag,
    source_key: item.source_key,
    source_mapping_key: item.source_mapping_key,
    source_path: item.source_path,
    summary_kind: item.summary_kind,
    title_key: canonicalId(item.title_key, `${item.source_key}.title`),
    summary_key: canonicalId(item.summary_key, `${item.source_key}.summary`),
    priority: Math.trunc(Number.isFinite(item.priority) ? Number(item.priority) : 0),
    tie_key: canonicalId(item.tie_key, `${item.source_tag}:${item.source_key}:${item.agenda_item_id}`),
    subject_ref_id: canonicalOptionalId(item.subject_ref_id),
    related_entity_ids: canonicalStringList(item.related_entity_ids),
    note_tags: canonicalStringList(item.note_tags)
  }
}

export function buildCourtAgendaRegistry(
  input: { items?: readonly CourtAgendaItemDraftV0[] } = {}
): CourtAgendaRegistryV0 {
  const sourceMappings = buildCourtAgendaSourceMappings()
  const sourceMappingKeys = sourceMappings.map((mapping) => mapping.source_mapping_key)
  const sourceMappingsLookup = sourceMappingsByKey(sourceMappings)
  const normalizedItems = (input.items ?? [])
    .map((draft) => createCourtAgendaItem(draft, sourceMappings))
    .sort(compareAgendaItems)

  const itemsById = new Map<string, CourtAgendaItemV0>()
  for (const item of normalizedItems) {
    if (itemsById.has(item.agenda_item_id)) continue
    itemsById.set(item.agenda_item_id, item)
  }

  const itemIds = [...itemsById.keys()]

  return {
    schema_version: COURT_AGENDA_REGISTRY_SCHEMA_VERSION,
    source_tags: [...COURT_AGENDA_SOURCE_TAGS],
    source_mapping_keys: sourceMappingKeys,
    source_mappings_by_key: buildOrderedRecord(sourceMappingKeys, (key) =>
      toCourtAgendaSourceMappingSnapshot(sourceMappingsLookup[key])
    ),
    item_ids: itemIds,
    items_by_id: buildOrderedRecord(itemIds, (itemId) => toCourtAgendaItemSnapshot(itemsById.get(itemId)!))
  }
}

export function serializeCourtAgendaRegistry(registry: CourtAgendaRegistryV0): string {
  const sourceMappingKeys = [...registry.source_mapping_keys].sort(compareText)
  const itemIds = [...registry.item_ids]
    .filter((itemId) => Boolean(registry.items_by_id[itemId]))
    .sort((a, b) => compareAgendaItems(registry.items_by_id[a], registry.items_by_id[b]))

  return JSON.stringify({
    schema_version: COURT_AGENDA_REGISTRY_SCHEMA_VERSION,
    source_tags: [...COURT_AGENDA_SOURCE_TAGS],
    source_mapping_keys: sourceMappingKeys,
    source_mappings_by_key: buildOrderedRecord(sourceMappingKeys, (key) =>
      toCourtAgendaSourceMappingSnapshot(registry.source_mappings_by_key[key])
    ),
    item_ids: itemIds,
    items_by_id: buildOrderedRecord(itemIds, (itemId) => toCourtAgendaItemSnapshot(registry.items_by_id[itemId]))
  })
}

type ObligationAgendaSourceKind = "enforcement" | "arrears" | "current_due"
type PortfolioAgendaMetricKey =
  | "outlier.highest.arrears_coin"
  | "outlier.highest.arrears_bushels"
  | "outlier.highest.tax_due_coin"
  | "outlier.highest.tithe_due_bushels"
  | "outlier.highest.consumption.shortage_bushels"
  | "outlier.lowest.net.coin"
  | "outlier.lowest.net.food_stores"
  | "outlier.lowest.net.meat_stores"

const PORTFOLIO_AGENDA_METRIC_KEYS: readonly PortfolioAgendaMetricKey[] = [
  "outlier.highest.arrears_coin",
  "outlier.highest.arrears_bushels",
  "outlier.highest.tax_due_coin",
  "outlier.highest.tithe_due_bushels",
  "outlier.highest.consumption.shortage_bushels",
  "outlier.lowest.net.coin",
  "outlier.lowest.net.food_stores",
  "outlier.lowest.net.meat_stores"
] as const

type AgendaCandidateDraft = CourtAgendaItemDraftV0 & {
  agenda_item_id: string
  tie_key: string
  priority: number
}

function compareAgendaDrafts(a: AgendaCandidateDraft, b: AgendaCandidateDraft): number {
  if (a.priority !== b.priority) return b.priority - a.priority
  const tieCmp = compareText(a.tie_key, b.tie_key)
  if (tieCmp !== 0) return tieCmp
  return compareText(a.agenda_item_id, b.agenda_item_id)
}

function normalizeAgendaLimit(value: number | null | undefined): number {
  const normalized = Math.trunc(Number.isFinite(value) ? Number(value) : COURT_AGENDA_ITEM_LIMIT)
  return Math.max(0, normalized)
}

function orderIndex(values: readonly string[], value: string): number {
  const index = values.indexOf(value)
  return index >= 0 ? index : values.length
}

function obligationSourceMappingKey(sourceKey: CourtAgendaObligationSourceKeyV0): string {
  return makeCourtAgendaSourceMappingKey("obligations", sourceKey)
}

function prospectSourceMappingKey(sourceKey: CourtAgendaProspectSourceKeyV0): string {
  return makeCourtAgendaSourceMappingKey("prospects", sourceKey)
}

function officeSourceMappingKey(sourceKey: CourtAgendaOfficeSourceKeyV0): string {
  return makeCourtAgendaSourceMappingKey("offices", sourceKey)
}

function portfolioSourceMappingKey(sourceKey: PortfolioAgendaMetricKey): string {
  return makeCourtAgendaSourceMappingKey("portfolio_outliers", sourceKey)
}

function buildObligationAgendaDrafts(state: RunState): AgendaCandidateDraft[] {
  const view = buildEconomyObligationsView(state)
  const counterpartyOrder = [...view.counterparty_order]
  const usedCounterparties = new Set<string>()
  const drafts: AgendaCandidateDraft[] = []

  function pickBestCandidate(kind: ObligationAgendaSourceKind) {
    const candidates = view.counterparty_summaries
      .filter((summary) => {
        if (usedCounterparties.has(summary.counterparty_kind)) return false
        if (kind === "enforcement") return summary.enforcement_state === "arrears"
        if (kind === "arrears") return summary.arrears_amount > 0
        return summary.due_amount > 0
      })
      .sort((left, right) => {
        const leftMagnitude =
          kind === "enforcement"
            ? left.total_outstanding
            : kind === "arrears"
              ? left.arrears_amount
              : left.due_amount
        const rightMagnitude =
          kind === "enforcement"
            ? right.total_outstanding
            : kind === "arrears"
              ? right.arrears_amount
              : right.due_amount
        if (leftMagnitude !== rightMagnitude) return rightMagnitude - leftMagnitude
        return (
          orderIndex(counterpartyOrder, left.counterparty_kind) - orderIndex(counterpartyOrder, right.counterparty_kind) ||
          compareText(left.counterparty_id, right.counterparty_id)
        )
      })

    return candidates[0] ?? null
  }

  const enforcement = pickBestCandidate("enforcement")
  if (enforcement) {
    usedCounterparties.add(enforcement.counterparty_kind)
    drafts.push({
      agenda_item_id: `agenda_obligations_enforcement_${enforcement.counterparty_kind}`,
      source_mapping_key: obligationSourceMappingKey("obligations.enforcement"),
      title_key: "agenda.obligations.enforcement.title",
      summary_key: "agenda.obligations.enforcement.summary",
      priority: 980 + enforcement.total_outstanding,
      tie_key: `00_obligations_enforcement:${enforcement.counterparty_kind}:${enforcement.counterparty_id}`,
      subject_ref_id: enforcement.counterparty_id,
      related_entity_ids: [enforcement.contract_id],
      note_tags: [
        `counterparty:${enforcement.counterparty_kind}`,
        `enforcement_state:${enforcement.enforcement_state}`,
        `settlement_status:${enforcement.settlement_status}`
      ]
    })
  }

  const arrears = pickBestCandidate("arrears")
  if (arrears) {
    usedCounterparties.add(arrears.counterparty_kind)
    drafts.push({
      agenda_item_id: `agenda_obligations_arrears_${arrears.counterparty_kind}`,
      source_mapping_key: obligationSourceMappingKey("obligations.arrears"),
      title_key: "agenda.obligations.arrears.title",
      summary_key: "agenda.obligations.arrears.summary",
      priority: 940 + arrears.arrears_amount,
      tie_key: `01_obligations_arrears:${arrears.counterparty_kind}:${arrears.counterparty_id}`,
      subject_ref_id: arrears.counterparty_id,
      related_entity_ids: [arrears.contract_id],
      note_tags: [`counterparty:${arrears.counterparty_kind}`, `settlement_status:${arrears.settlement_status}`]
    })
  }

  const currentDue = pickBestCandidate("current_due")
  if (currentDue) {
    drafts.push({
      agenda_item_id: `agenda_obligations_due_${currentDue.counterparty_kind}`,
      source_mapping_key: obligationSourceMappingKey("obligations.current_due"),
      title_key: "agenda.obligations.current_due.title",
      summary_key: "agenda.obligations.current_due.summary",
      priority: 880 + currentDue.due_amount,
      tie_key: `02_obligations_due:${currentDue.counterparty_kind}:${currentDue.counterparty_id}`,
      subject_ref_id: currentDue.counterparty_id,
      related_entity_ids: [currentDue.contract_id],
      note_tags: [`counterparty:${currentDue.counterparty_kind}`, `settlement_status:${currentDue.settlement_status}`]
    })
  }

  return drafts
}

function orderedProspects(prospectsWindow: ProspectsWindow | null | undefined) {
  if (!prospectsWindow || !Array.isArray(prospectsWindow.prospects)) return []

  const byId = new Map<string, (typeof prospectsWindow.prospects)[number]>()
  for (const prospect of prospectsWindow.prospects) {
    if (!prospect || typeof prospect !== "object" || typeof prospect.id !== "string") continue
    byId.set(prospect.id, prospect)
  }

  const ordered = (Array.isArray(prospectsWindow.shown_ids) ? prospectsWindow.shown_ids : [])
    .map((prospectId) => (typeof prospectId === "string" ? byId.get(prospectId) ?? null : null))
    .filter((prospect): prospect is NonNullable<typeof prospect> => Boolean(prospect))

  const leftovers = prospectsWindow.prospects
    .filter((prospect) => typeof prospect?.id === "string" && !ordered.some((candidate) => candidate.id === prospect.id))
    .sort((left, right) => compareText(left.id, right.id))

  return [...ordered, ...leftovers]
}

function buildProspectAgendaDrafts(
  state: RunState,
  prospectsWindow: ProspectsWindow | null | undefined
): AgendaCandidateDraft[] {
  const prospects = orderedProspects(prospectsWindow)
  const usedProspectIds = new Set<string>()
  const drafts: AgendaCandidateDraft[] = []
  const nowTurn = Math.trunc(state.turn_index ?? 0)

  const expiring = prospects
    .filter((prospect) => typeof prospect.expires_turn === "number" && prospect.expires_turn <= nowTurn + 1)
    .sort((left, right) => left.expires_turn - right.expires_turn || compareText(left.id, right.id))[0]

  if (expiring) {
    usedProspectIds.add(expiring.id)
    drafts.push({
      agenda_item_id: `agenda_prospects_expiring_${expiring.id}`,
      source_mapping_key: prospectSourceMappingKey("prospects.expiring"),
      title_key: "agenda.prospects.expiring.title",
      summary_key: "agenda.prospects.expiring.summary",
      priority: 960 + Math.max(0, nowTurn + 1 - expiring.expires_turn),
      tie_key: `03_prospects_expiring:${String(expiring.expires_turn).padStart(4, "0")}:${expiring.id}`,
      subject_ref_id: expiring.id,
      related_entity_ids: [expiring.subject_person_id, expiring.type],
      note_tags: [`prospect_type:${expiring.type}`]
    })
  }

  const grant = prospects
    .filter((prospect) => prospect.type === "grant" && !usedProspectIds.has(prospect.id))
    .sort((left, right) => left.expires_turn - right.expires_turn || compareText(left.id, right.id))[0]

  if (grant) {
    usedProspectIds.add(grant.id)
    drafts.push({
      agenda_item_id: `agenda_prospects_grant_${grant.id}`,
      source_mapping_key: prospectSourceMappingKey("prospects.grant"),
      title_key: "agenda.prospects.grant.title",
      summary_key: "agenda.prospects.grant.summary",
      priority: 900,
      tie_key: `04_prospects_grant:${grant.id}`,
      subject_ref_id: grant.id,
      related_entity_ids: [grant.subject_person_id],
      note_tags: ["prospect_type:grant"]
    })
  }

  const marriage = prospects
    .filter((prospect) => prospect.type === "marriage" && !usedProspectIds.has(prospect.id))
    .sort((left, right) => left.expires_turn - right.expires_turn || compareText(left.id, right.id))[0]

  if (marriage) {
    drafts.push({
      agenda_item_id: `agenda_prospects_marriage_${marriage.id}`,
      source_mapping_key: prospectSourceMappingKey("prospects.marriage"),
      title_key: "agenda.prospects.marriage.title",
      summary_key: "agenda.prospects.marriage.summary",
      priority: 860,
      tie_key: `05_prospects_marriage:${marriage.id}`,
      subject_ref_id: marriage.id,
      related_entity_ids: [marriage.subject_person_id, marriage.spouse_person_id ?? ""],
      note_tags: ["prospect_type:marriage"]
    })
  }

  return drafts
}

function buildOfficeAgendaDrafts(state: RunState): AgendaCandidateDraft[] {
  const registry = ensureCourtOfficeRegistry(state)
  const serviceRegistry = ensureCourtServiceRecordRegistry(state)
  const delegationView = buildCourtDelegationView(state)
  const usedSeatIds = new Set<string>()
  const drafts: AgendaCandidateDraft[] = []

  const requiredVacancySeatId = [...registry.vacant_required_seat_ids].sort(compareText)[0]
  if (requiredVacancySeatId) {
    const seat = registry.seats_by_id[requiredVacancySeatId]
    const vacancyTurns =
      seat && seat.vacancy_started_turn_index !== null ? Math.max(0, Math.trunc(state.turn_index) - seat.vacancy_started_turn_index) : 0
    usedSeatIds.add(requiredVacancySeatId)
    drafts.push({
      agenda_item_id: `agenda_offices_required_vacancy_${requiredVacancySeatId}`,
      source_mapping_key: officeSourceMappingKey("offices.required_vacancy"),
      title_key: "agenda.offices.required_vacancy.title",
      summary_key: "agenda.offices.required_vacancy.summary",
      priority: 970 + vacancyTurns,
      tie_key: `06_offices_required_vacancy:${requiredVacancySeatId}`,
      subject_ref_id: requiredVacancySeatId,
      related_entity_ids: [seat?.seat_key ?? ""],
      note_tags: [`scope:${seat?.scope ?? "house"}`]
    })
  }

  const realmTransitionSeat = registry.seat_ids
    .map((seatId) => registry.seats_by_id[seatId])
    .filter(
      (seat) =>
        seat.scope === "realm" &&
        seat.last_transition_turn_index !== null &&
        seat.last_transition_turn_index >= Math.max(0, Math.trunc(state.turn_index) - 1) &&
        !usedSeatIds.has(seat.seat_id)
    )
    .sort((left, right) => {
      if ((left.last_transition_turn_index ?? -1) !== (right.last_transition_turn_index ?? -1)) {
        return (right.last_transition_turn_index ?? -1) - (left.last_transition_turn_index ?? -1)
      }
      return compareText(left.seat_id, right.seat_id)
    })[0]

  if (realmTransitionSeat) {
    usedSeatIds.add(realmTransitionSeat.seat_id)
    drafts.push({
      agenda_item_id: `agenda_offices_realm_transition_${realmTransitionSeat.seat_id}`,
      source_mapping_key: officeSourceMappingKey("offices.realm_holder_transition"),
      title_key: "agenda.offices.realm_holder_transition.title",
      summary_key: "agenda.offices.realm_holder_transition.summary",
      priority: 920 + (realmTransitionSeat.last_transition_turn_index ?? 0),
      tie_key: `07_offices_realm_transition:${realmTransitionSeat.seat_id}`,
      subject_ref_id: realmTransitionSeat.seat_id,
      related_entity_ids: [realmTransitionSeat.holder_person_id ?? "", realmTransitionSeat.seat_key],
      note_tags: [`scope:${realmTransitionSeat.scope}`]
    })
  }

  const delegatedAction = [...delegationView.active_action_keys].sort(compareText)[0]
  if (delegatedAction) {
    drafts.push({
      agenda_item_id: `agenda_offices_delegated_action_${delegatedAction}`,
      source_mapping_key: officeSourceMappingKey("offices.delegated_action"),
      title_key: "agenda.offices.delegated_action.title",
      summary_key: "agenda.offices.delegated_action.summary",
      priority: 820,
      tie_key: `08_offices_delegated_action:${delegatedAction}`,
      subject_ref_id: delegatedAction,
      note_tags: [`action:${delegatedAction}`]
    })
  }

  const activeServiceRecord = serviceRegistry.active_record_ids
    .map((recordId) => serviceRegistry.records_by_id[recordId])
    .filter(
      (record) =>
        Boolean(record) &&
        !usedSeatIds.has(record.seat_id) &&
        (record.holder_kind !== "household_member" || resolveCourtServicePlacementTarget(record).kind === "institution_assignment")
    )
    .sort((left, right) => compareText(left.record_id, right.record_id))[0]

  if (activeServiceRecord) {
    drafts.push({
      agenda_item_id: `agenda_offices_active_service_${activeServiceRecord.record_id}`,
      source_mapping_key: officeSourceMappingKey("offices.active_service_record"),
      title_key: "agenda.offices.active_service_record.title",
      summary_key: "agenda.offices.active_service_record.summary",
      priority: 780,
      tie_key: `09_offices_active_service:${activeServiceRecord.record_id}`,
      subject_ref_id: activeServiceRecord.record_id,
      related_entity_ids: [activeServiceRecord.seat_id, activeServiceRecord.holder_person_id],
      note_tags: [
        `holder_kind:${activeServiceRecord.holder_kind}`,
        `placement:${resolveCourtServicePlacementTarget(activeServiceRecord).kind}`
      ]
    })
  }

  return drafts
}

function portfolioMetricPriority(metricKey: PortfolioAgendaMetricKey, value: number): number {
  const magnitude = Math.abs(Math.trunc(value))
  switch (metricKey) {
    case "outlier.highest.arrears_coin":
      return 930 + magnitude
    case "outlier.highest.arrears_bushels":
      return 920 + magnitude
    case "outlier.highest.consumption.shortage_bushels":
      return 910 + magnitude
    case "outlier.highest.tax_due_coin":
      return 870 + magnitude
    case "outlier.highest.tithe_due_bushels":
      return 860 + magnitude
    case "outlier.lowest.net.coin":
      return 850 + magnitude
    case "outlier.lowest.net.food_stores":
      return 840 + magnitude
    case "outlier.lowest.net.meat_stores":
      return 830 + magnitude
  }
}

function isAgendaWorthyPortfolioValue(metricKey: PortfolioAgendaMetricKey, value: number): boolean {
  if (metricKey.startsWith("outlier.lowest.net.")) return value < 0
  return value > 0
}

function buildPortfolioAgendaDrafts(state: RunState): AgendaCandidateDraft[] {
  const analysis = buildEconomyPortfolioAnalysisFromState(state)
  const drafts: AgendaCandidateDraft[] = []
  const usedManorIds = new Set<string>()

  const candidates = PORTFOLIO_AGENDA_METRIC_KEYS.flatMap((metricKey) => {
    const entry = analysis.outliers_by_metric[metricKey][0]
    if (!entry || !isAgendaWorthyPortfolioValue(metricKey, entry.value)) return []
    return [
      {
        metricKey,
        entry
      }
    ]
  }).sort((left, right) => {
    const priorityDiff = portfolioMetricPriority(right.metricKey, right.entry.value) - portfolioMetricPriority(left.metricKey, left.entry.value)
    if (priorityDiff !== 0) return priorityDiff
    return compareText(`${left.metricKey}:${left.entry.manor_key}`, `${right.metricKey}:${right.entry.manor_key}`)
  })

  for (const candidate of candidates) {
    if (usedManorIds.has(candidate.entry.manor_id)) continue
    usedManorIds.add(candidate.entry.manor_id)
    drafts.push({
      agenda_item_id: `agenda_portfolio_outlier_${candidate.metricKey.replaceAll(".", "_")}_${candidate.entry.manor_id}`,
      source_mapping_key: portfolioSourceMappingKey(candidate.metricKey),
      title_key: "agenda.portfolio_outlier.title",
      summary_key: "agenda.portfolio_outlier.summary",
      priority: portfolioMetricPriority(candidate.metricKey, candidate.entry.value),
      tie_key: `10_portfolio_outlier:${candidate.metricKey}:${candidate.entry.manor_key}`,
      subject_ref_id: candidate.entry.manor_id,
      related_entity_ids: [candidate.entry.manor_key],
      note_tags: [`metric:${candidate.metricKey}`]
    })
  }

  return drafts
}

export function buildCourtAgendaRegistryFromState(
  state: RunState,
  options: BuildCourtAgendaRegistryFromStateOptions = {}
): CourtAgendaRegistryV0 {
  const drafts = [
    ...buildObligationAgendaDrafts(state),
    ...buildProspectAgendaDrafts(state, options.prospects_window),
    ...buildOfficeAgendaDrafts(state),
    ...buildPortfolioAgendaDrafts(state)
  ].sort(compareAgendaDrafts)

  return buildCourtAgendaRegistry({ items: drafts })
}

export function ensureCourtAgendaRegistry(
  state: RunState,
  options: BuildCourtAgendaRegistryFromStateOptions = {}
): CourtAgendaRegistryV0 {
  const registry = buildCourtAgendaRegistryFromState(state, options)
  ;(state as any).court_agenda_registry = registry
  ;(state.house as any).court_agenda_registry = registry
  return registry
}

export function selectCourtAgendaItems(
  registry: CourtAgendaRegistryV0,
  limit: number = COURT_AGENDA_ITEM_LIMIT
): CourtAgendaItemV0[] {
  const normalizedLimit = normalizeAgendaLimit(limit)
  const orderedItemIds = [...registry.item_ids]
    .filter((itemId) => Boolean(registry.items_by_id[itemId]))
    .sort((left, right) => compareAgendaItems(registry.items_by_id[left], registry.items_by_id[right]))

  return orderedItemIds.slice(0, normalizedLimit).map((itemId) => registry.items_by_id[itemId])
}

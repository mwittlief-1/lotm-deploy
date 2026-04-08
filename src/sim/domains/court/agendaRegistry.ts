import {
  ECONOMY_PORTFOLIO_OUTLIER_METRIC_KEYS,
  type EconomyPortfolioOutlierMetricKeyV1
} from "../economy/portfolioRegistry"

export const COURT_AGENDA_REGISTRY_SCHEMA_VERSION = "court_agenda_registry_v0" as const
export const COURT_AGENDA_ITEM_SCHEMA_VERSION = "court_agenda_item_v0" as const
export const COURT_AGENDA_SOURCE_MAPPING_SCHEMA_VERSION = "court_agenda_source_mapping_v0" as const

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

import { describe, expect, it } from "vitest"

import {
  COURT_AGENDA_ITEM_SCHEMA_VERSION,
  COURT_AGENDA_OBLIGATION_SOURCE_KEYS,
  COURT_AGENDA_OFFICE_SOURCE_KEYS,
  COURT_AGENDA_PORTFOLIO_OUTLIER_SOURCE_KEYS,
  COURT_AGENDA_PROSPECT_SOURCE_KEYS,
  COURT_AGENDA_REGISTRY_SCHEMA_VERSION,
  COURT_AGENDA_SOURCE_MAPPING_SCHEMA_VERSION,
  COURT_AGENDA_SOURCE_TAGS,
  buildCourtAgendaRegistry,
  buildCourtAgendaSourceMappings,
  createCourtAgendaItem,
  makeCourtAgendaItemKey,
  makeCourtAgendaSourceMappingKey,
  serializeCourtAgendaRegistry
} from "../../src/sim/domains/court/agendaRegistry"

describe("court agenda registry contract", () => {
  it("locks the typed source-tag inventory and mapping coverage", () => {
    const sourceMappings = buildCourtAgendaSourceMappings()

    expect(COURT_AGENDA_REGISTRY_SCHEMA_VERSION).toBe("court_agenda_registry_v0")
    expect(COURT_AGENDA_ITEM_SCHEMA_VERSION).toBe("court_agenda_item_v0")
    expect(COURT_AGENDA_SOURCE_MAPPING_SCHEMA_VERSION).toBe("court_agenda_source_mapping_v0")
    expect(COURT_AGENDA_SOURCE_TAGS).toEqual([
      "obligations",
      "prospects",
      "offices",
      "portfolio_outliers"
    ])
    expect(COURT_AGENDA_OBLIGATION_SOURCE_KEYS).toEqual([
      "obligations.current_due",
      "obligations.arrears",
      "obligations.enforcement"
    ])
    expect(COURT_AGENDA_PROSPECT_SOURCE_KEYS).toEqual([
      "prospects.expiring",
      "prospects.marriage",
      "prospects.grant"
    ])
    expect(COURT_AGENDA_OFFICE_SOURCE_KEYS).toEqual([
      "offices.required_vacancy",
      "offices.delegated_action",
      "offices.active_service_record",
      "offices.realm_holder_transition"
    ])
    expect(COURT_AGENDA_PORTFOLIO_OUTLIER_SOURCE_KEYS).toEqual([
      "outlier.highest.coin",
      "outlier.lowest.coin",
      "outlier.highest.food_stores",
      "outlier.lowest.food_stores",
      "outlier.highest.meat_stores",
      "outlier.lowest.meat_stores",
      "outlier.highest.tax_due_coin",
      "outlier.highest.tithe_due_bushels",
      "outlier.highest.arrears_coin",
      "outlier.highest.arrears_bushels",
      "outlier.highest.production.food_delta",
      "outlier.highest.production.meat_delta",
      "outlier.highest.consumption.shortage_bushels",
      "outlier.lowest.net.coin",
      "outlier.lowest.net.food_stores",
      "outlier.lowest.net.meat_stores"
    ])

    expect(sourceMappings.map((mapping) => `${mapping.source_tag}:${mapping.source_key}`)).toEqual([
      "obligations:obligations.current_due",
      "obligations:obligations.arrears",
      "obligations:obligations.enforcement",
      "prospects:prospects.expiring",
      "prospects:prospects.marriage",
      "prospects:prospects.grant",
      "offices:offices.required_vacancy",
      "offices:offices.delegated_action",
      "offices:offices.active_service_record",
      "offices:offices.realm_holder_transition",
      "portfolio_outliers:outlier.highest.coin",
      "portfolio_outliers:outlier.lowest.coin",
      "portfolio_outliers:outlier.highest.food_stores",
      "portfolio_outliers:outlier.lowest.food_stores",
      "portfolio_outliers:outlier.highest.meat_stores",
      "portfolio_outliers:outlier.lowest.meat_stores",
      "portfolio_outliers:outlier.highest.tax_due_coin",
      "portfolio_outliers:outlier.highest.tithe_due_bushels",
      "portfolio_outliers:outlier.highest.arrears_coin",
      "portfolio_outliers:outlier.highest.arrears_bushels",
      "portfolio_outliers:outlier.highest.production.food_delta",
      "portfolio_outliers:outlier.highest.production.meat_delta",
      "portfolio_outliers:outlier.highest.consumption.shortage_bushels",
      "portfolio_outliers:outlier.lowest.net.coin",
      "portfolio_outliers:outlier.lowest.net.food_stores",
      "portfolio_outliers:outlier.lowest.net.meat_stores"
    ])
  })

  it("builds canonical mapping and item keys and normalizes agenda items from the mapping registry", () => {
    const outlierMappingKey = makeCourtAgendaSourceMappingKey("portfolio_outliers", "outlier.highest.arrears_coin")
    const item = createCourtAgendaItem({
      agenda_item_id: "  agenda_arrears_watch  ",
      source_mapping_key: outlierMappingKey,
      title_key: " agenda.portfolio_outlier.title ",
      summary_key: " agenda.portfolio_outlier.summary ",
      priority: 87,
      tie_key: " 03_portfolio ",
      subject_ref_id: " manor:west_hall ",
      related_entity_ids: [" manor:west_hall ", "manor:west_hall", "house:h_player"],
      note_tags: [" outlier ", "portfolio", "outlier"]
    })

    expect(outlierMappingKey).toBe("court_agenda_source:portfolio_outliers:outlier.highest.arrears_coin")
    expect(makeCourtAgendaItemKey("agenda_arrears_watch")).toBe("court_agenda_item:agenda_arrears_watch")
    expect(item).toEqual({
      schema_version: COURT_AGENDA_ITEM_SCHEMA_VERSION,
      agenda_item_id: "agenda_arrears_watch",
      agenda_item_key: "court_agenda_item:agenda_arrears_watch",
      source_tag: "portfolio_outliers",
      source_key: "outlier.highest.arrears_coin",
      source_mapping_key: "court_agenda_source:portfolio_outliers:outlier.highest.arrears_coin",
      source_path: "portfolio.outliers_by_metric.outlier.highest.arrears_coin[]",
      summary_kind: "portfolio_outlier",
      title_key: "agenda.portfolio_outlier.title",
      summary_key: "agenda.portfolio_outlier.summary",
      priority: 87,
      tie_key: "03_portfolio",
      subject_ref_id: "manor:west_hall",
      related_entity_ids: ["house:h_player", "manor:west_hall"],
      note_tags: ["outlier", "portfolio"]
    })
  })

  it("serializes deterministically regardless of input order and duplicate drafts", () => {
    const obligationsMappingKey = makeCourtAgendaSourceMappingKey("obligations", "obligations.arrears")
    const officeMappingKey = makeCourtAgendaSourceMappingKey("offices", "offices.required_vacancy")
    const prospectMappingKey = makeCourtAgendaSourceMappingKey("prospects", "prospects.expiring")

    const registryA = buildCourtAgendaRegistry({
      items: [
        {
          agenda_item_id: "office_watch",
          source_mapping_key: officeMappingKey,
          priority: 80,
          tie_key: "02_office",
          title_key: "agenda.office.title",
          summary_key: "agenda.office.summary"
        },
        {
          agenda_item_id: "obligations_watch",
          source_mapping_key: obligationsMappingKey,
          priority: 90,
          tie_key: "01_obligations",
          title_key: "agenda.obligations.title",
          summary_key: "agenda.obligations.summary"
        },
        {
          agenda_item_id: "prospect_watch",
          source_mapping_key: prospectMappingKey,
          priority: 70,
          tie_key: "03_prospect",
          title_key: "agenda.prospect.title",
          summary_key: "agenda.prospect.summary"
        }
      ]
    })

    const registryB = buildCourtAgendaRegistry({
      items: [
        {
          agenda_item_id: "prospect_watch",
          source_mapping_key: prospectMappingKey,
          priority: 70,
          tie_key: "03_prospect",
          title_key: "agenda.prospect.title",
          summary_key: "agenda.prospect.summary"
        },
        {
          agenda_item_id: "obligations_watch",
          source_mapping_key: obligationsMappingKey,
          priority: 5,
          tie_key: "99_duplicate",
          title_key: "agenda.duplicate.title",
          summary_key: "agenda.duplicate.summary"
        },
        {
          agenda_item_id: "office_watch",
          source_mapping_key: officeMappingKey,
          priority: 80,
          tie_key: "02_office",
          title_key: "agenda.office.title",
          summary_key: "agenda.office.summary"
        },
        {
          agenda_item_id: "obligations_watch",
          source_mapping_key: obligationsMappingKey,
          priority: 90,
          tie_key: "01_obligations",
          title_key: "agenda.obligations.title",
          summary_key: "agenda.obligations.summary"
        }
      ]
    })

    expect(registryA.item_ids).toEqual([
      "obligations_watch",
      "office_watch",
      "prospect_watch"
    ])
    expect(registryB.item_ids).toEqual([
      "obligations_watch",
      "office_watch",
      "prospect_watch"
    ])
    expect(serializeCourtAgendaRegistry(registryA)).toBe(serializeCourtAgendaRegistry(registryB))
  })
})

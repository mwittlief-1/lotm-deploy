# Holding Fabric Legal Rules v0.1

Last Updated: 2026-03-30

## Intent

This note defines the legal and institutional interpretation of the current
`holding_fabric_v1.json` scaffold. It is a canon and schema pass, not a mapgen
retune.

The document is grounded in:

- [holding_fabric_v1.json](/Users/matt_wittlief_home/lotm-mapgen/data/map/holding_fabric_v1.json)
- [xmap_alpha_v1.md](/Users/matt_wittlief_home/lotm-mapgen/docs/schemas/xmap_alpha_v1.md)
- the active Current World Context v1 guardrail in
  [map_v1_config.json](/Users/matt_wittlief_home/lotm-mapgen/data/map/map_v1_config.json)
- the current tuned Current World Context v1 bundle in
  [xmap_alpha_manifest_v1.json](/Users/matt_wittlief_home/lotm-mapgen/data/map/xmap_alpha_manifest_v1.json)

Historical frame:

- English 12th-13th century feudal-law baseline
- limited continental flexibility for mixed secular and ecclesiastical geography
- distinction between tenure, jurisdiction, and franchise rights is mandatory

## Scope

This note defines:

- how each current holding type should be read legally
- how county, bishopric, and archbishopric overlays relate to ownership
- provisional incident rules for succession failure and vacancy
- church temporalities versus spiritual jurisdiction
- coarse royal-forest overlay behavior
- recommended future fields for `holding_fabric_v2`

This note does not define:

- fiscal-engine math
- crop or tax simulation
- exhaustive succession-law branching
- title-precedence simulation for every historical corner case
- mapgen retuning

## Scaffold Reading Rules

The current artifact already distinguishes several layers, but not every layer
is the same kind of thing.

1. `holding_type` identifies the immediate holding family assigned to the manor.
   It is the closest thing in `holding_fabric_v1.json` to the present legal
   holder layer.
2. `county_id` is an administrative and jurisdictional overlay. It is not
   blanket ownership of the county.
3. `bishopric_id` and `archbishopric_id` are ecclesiastical overlays. They are
   not automatic proof that a bishop or archbishop owns the manor.
4. `holding_id -> county_id -> bishopric_id -> archbishopric_id` is therefore
   not a pure feudal lord chain. It is a mixed stack of ownership plus
   jurisdiction plus ecclesiastical oversight.

In short:

- ownership and tenure run through the holding
- county runs through administration and public jurisdiction
- bishopric and archbishopric run through ecclesiastical jurisdiction, and only
  sometimes through temporal ownership

## Locked Decisions

1. `county_domain` means the count's direct demesne plus county-seat
   office-support land. It is not blanket county ownership.
2. `county` remains an administrative and jurisdictional overlay, separate from
   direct ownership.
3. `church_fief` remains a single top-level holding type in v0.1.
4. `church_fief` must later carry holder metadata:
   - `church_holder_kind = bishopric | abbey | parish_benefice | collegiate | other`
   - `holder_actor_id`
   - `holder_actor_type`
5. `barony` remains the single public canonical term.
6. Any direct-versus-mesne nuance for baronies should be expressed with chain
   fields, not a split public vocabulary.
7. Market, fair, and toll rights are franchise rights, not automatic settlement
   or holding rights.
8. Royal forest remains a legal overlay on top of underlying tenure. It is not
   a terrain synonym.
9. Forest law stays coarse in v0.1:
   - overlay active or inactive
   - restricted use and hunting
   - special fines and jurisdiction
   - underlying tenure remains
10. Advowson and patronage rights are deferred as future work.

## Core Legal Model

### Ownership, Jurisdiction, and Franchise

These must remain separate everywhere.

- Ownership: who directly holds the land bundle and seigneurial income stream.
- Jurisdiction: who has public, seigneurial, ecclesiastical, or special-court
  authority over disputes, offenses, and administration.
- Franchise: special granted rights, such as market, fair, toll, bridge, or
  fair-day privilege, which do not arise automatically from settlement class.

### Immediate Lord and Superior Lord

For v0.1, every manor should be interpretable through:

- an immediate lord layer
- an optional superior lord layer
- any overlay layers that do not change the immediate tenure relationship

The current scaffold only partially encodes this. Until `holding_fabric_v2`
exists:

- `holding_type` is the best available proxy for immediate holding family
- county, bishopric, and archbishopric IDs should not be treated as automatic
  superior lords

### Service Basis

Service basis should be treated as a coarse legal family, not a precise quota.
The v0.1 families are:

- royal demesne service and revenue
- military or scutage-like lay service
- office-linked comital service
- ecclesiastical temporal service
- court attendance and counsel

## Holding Types

### `crown_domain`

Meaning:

- direct royal demesne, royal seat support land, castle support land, or other
  land retained directly to the Crown

Immediate lord:

- the Crown

Superior lord:

- none

Tenure basis:

- royal demesne by direct possession

Default service basis:

- no upward service
- contributes directly to royal revenue, hospitality, military staging, castle
  support, and office support as configured later

Default succession incidents:

- not hereditary by private right in the ordinary sense
- alienation, grant, custody, or regrant are crown acts
- escheat does not apply upward because the Crown is already the direct lord

Court and jurisdiction rights:

- royal justice and demesne management by default
- local private courts may exist only by explicit delegated franchise or office

Market, fair, and toll rights:

- not automatic
- Crown may grant or reserve them explicitly

Forest-law interaction:

- crown demesne inside active royal forest is the strongest forest case
- forest overlay restricts exploitation and hunting but does not change title

### `church_fief`

Meaning:

- direct ecclesiastical temporal holding, unified at top level in v0.1
- may later be clarified as bishopric, abbey, parish benefice, collegiate, or
  other church corporate holder

Immediate lord:

- the corporate or institutional church holder identified by future holder
  metadata

Superior lord:

- Crown by default in the current English baseline for major episcopal and
  abbatial temporalities
- may be a mesne lay or ecclesiastical superior in later explicit cases

Tenure basis:

- temporalities held by an ecclesiastical corporation or office

Default service basis:

- ecclesiastical and lay service must be distinguished
- spiritual office is not itself a lay fee
- temporalities may still owe homage, fealty, court attendance, renders, or
  `servitium regis` depending on holder and grant
- military obligation should be modeled coarsely through temporal service or
  commuted equivalents, not assumed as ordinary knight-service in all cases

Default succession incidents:

- no ordinary lay-hereditary succession for the corporate church holder
- no lay relief in the ordinary hereditary sense
- vacancy rules apply instead

Court and jurisdiction rights:

- land title may support seigneurial control over tenants
- spiritual jurisdiction does not arise merely from owning the land; it arises
  through bishopric or archbishopric office

Market, fair, and toll rights:

- not automatic
- church holders may possess them only by grant, custom, or explicit franchise

Forest-law interaction:

- church land can lie within royal forest
- underlying tenure remains church-held
- restricted hunting and exploitation still apply unless exempted

### `county_domain`

Meaning:

- the count's direct demesne plus county-seat office-support land
- not blanket county ownership

Immediate lord:

- the count or earl as holder of the county-seat demesne bundle

Superior lord:

- the Crown

Tenure basis:

- royal grant plus office-linked demesne

Default service basis:

- counsel, attendance, and office-linked support to the Crown
- military or administrative service may attach through office and tenure

Default succession incidents:

- unless later stabilized by hereditary county rules, treat as strongly Crown-
  conditioned
- on vacancy, forfeiture, or extinction, the Crown has first claim to
  re-assignment

Court and jurisdiction rights:

- county-domain land itself is owned directly by the count
- county court and sheriff functions arise from county office and jurisdiction,
  not from every acre in the county being comital property

Market, fair, and toll rights:

- not automatic
- county seat is a strong grant candidate, not an automatic franchise bundle

Forest-law interaction:

- county-domain land inside royal forest remains comital demesne in title but is
  subject to forest overlay restrictions

### `minor_lordship`

Meaning:

- a lesser lay direct holding that is not elevated to baronial aggregation in
  the current fabric

Immediate lord:

- the minor lay lord or house holder

Superior lord:

- Crown by default if held directly
- otherwise an explicitly encoded mesne superior in future versions

Tenure basis:

- lay fee by grant or subinfeudation

Default service basis:

- military service, scutage-like substitute, court attendance, and aids in
  coarse form

Default succession incidents:

- relief
- wardship
- marriage right over heirs and heiresses
- escheat for failure of heirs
- forfeiture for serious disloyalty or felony

Court and jurisdiction rights:

- customary seigneurial court over dependent tenants by default
- higher pleas remain above

Market, fair, and toll rights:

- not automatic
- require explicit franchise grant

Forest-law interaction:

- tenure remains
- use restrictions and special fines apply where forest overlay is active

### `barony`

Meaning:

- the canonical larger lay mesne holding family in the current scaffold
- keep one public term: `barony`

Immediate lord:

- the baron

Superior lord:

- Crown by default in the current English baseline
- may later be an explicit superior where chain depth is encoded

Tenure basis:

- tenure by barony in coarse form, or baronial aggregate holding under explicit
  superior-lord metadata

Default service basis:

- counsel and attendance
- military quota or scutage-like equivalent in coarse form
- seigneurial command over subordinate manors or minor lords where encoded

Default succession incidents:

- relief
- wardship
- marriage right
- escheat
- forfeiture

Court and jurisdiction rights:

- baronial court and mesne seigneurial authority in coarse form
- county and royal justice remain above it

Market, fair, and toll rights:

- not automatic
- a baronial seat is a strong candidate for later franchise grant, but the right
  itself remains distinct

Forest-law interaction:

- a barony may overlap royal forest without losing title
- forest overlay limits use and hunting and inserts special forest jurisdiction

## Overlays

### `county`

Controls:

- county-level administration
- county court and sheriff-scale public jurisdiction in coarse form
- public coordination of county seat, county routes, and county fiscal or levy
  surfaces when added later

Does not control:

- blanket ownership of all manors in the county
- automatic superior-lord status over every holding
- automatic market or toll rights

Ownership versus jurisdiction:

- county is primarily jurisdiction and administration
- `county_domain` is the count's owned demesne subset

### `bishopric`

Controls:

- diocesan spiritual jurisdiction in coarse form
- bishop-scale oversight of ecclesiastical institutions in the diocese
- temporal control only where the bishopric is also the holder of a `church_fief`

Does not control:

- automatic ownership of every manor within the diocese
- automatic superiority over all lay holdings in the bishopric

Ownership versus jurisdiction:

- bishopric overlay is usually ecclesiastical jurisdiction
- some bishop-held lands may also be temporalities through `church_fief`

### `archbishopric`

Controls:

- metropolitan oversight over bishoprics
- higher ecclesiastical jurisdiction in coarse form

Does not control:

- automatic ownership of diocesan land
- automatic lay superior-lord rights over secular holdings

Ownership versus jurisdiction:

- almost entirely jurisdictional in v0.1
- direct temporal ownership would need explicit future encoding

## Failure States

### Escheat

Definition:

- failure of heirs or lawful succession causes the holding to revert to the
  immediate lord

v0.1 rule:

- lay hereditary holdings escheat to the immediate lord
- county, bishopric, and archbishopric overlays remain as overlays unless the
  underlying land title also changes
- if the immediate lord cannot legally absorb the holding, escalate to the
  superior lord

### Forfeiture

Definition:

- loss of holding for grave disloyalty, felony, or comparable offense

v0.1 rule:

- treat forfeiture as a Crown-priority event in severe cases, especially
  treason
- ordinary forfeiture may first seize into the lord's hand before regrant or
  final escheat

### Wardship

Definition:

- custody of land and heir during minority

v0.1 rule:

- applies to lay hereditary holdings
- belongs to the immediate lord by default
- if the immediate lord is the Crown, royal wardship applies
- corporate church holdings do not take lay wardship in the same form

### Marriage Right

Definition:

- lord's right over marriage arrangements of an heir or heiress under lordship

v0.1 rule:

- applies to lay hereditary wardships
- belongs to the immediate lord by default
- should be modeled later as a rights family, not as automatic forced marriage
  logic

### Relief

Definition:

- payment by an adult heir entering inheritance

v0.1 rule:

- applies to lay hereditary holdings
- owed to the immediate lord
- Crown-facing relief should respect the Magna Carta style cap logic in later
  implementation
- church corporations on vacancy do not pay lay relief in the same manner as a
  hereditary lay heir

### Ecclesiastical Vacancy

Definition:

- period when a bishopric, abbey, or other ecclesiastical office is vacant

v0.1 rule:

- spiritual jurisdiction follows church process and higher ecclesiastical order
- temporalities are treated as being in lay custody, normally the Crown's hand
  in the English baseline, until lawful installation
- this is not the same as escheat

### Treason Edge Cases

v0.1 rule:

- treason overrides normal mesne-lord recovery and gives the Crown first claim
  to seizure
- subordinate tenures do not automatically vanish; they become subject to Crown
  decision, restoration, or regrant

## Church Lands: Temporalities and Spiritualities

This distinction is mandatory.

Temporalities:

- land
- rents
- mills
- woods
- fisheries
- regalia and income-bearing rights attached to the see or house

Spiritualities:

- cure of souls
- sacramental office
- diocesan or metropolitan jurisdiction in spiritual matters

v0.1 rule:

- `church_fief` represents temporal landholding
- `bishopric` and `archbishopric` overlays primarily represent spiritual and
  institutional jurisdiction
- the same church body may participate in both, but the fields must not be
  conflated conceptually

Obligations that may remain to lay lords or the Crown:

- homage or fealty for temporalities where historically appropriate
- service to the king in temporal matters
- attendance, aid, hospitality, or renders by grant or tenure basis
- forest-law compliance where overlay is active

Holder metadata required later for `church_fief`:

- `church_holder_kind`
- `holder_actor_id`
- `holder_actor_type`

## Markets, Fairs, and Tolls

v0.1 rule:

- no holding type gains market, fair, or toll rights automatically
- no settlement class gains them automatically
- these rights belong in a future `franchise_bundle`
- county seats, market towns, royal seats, abbeys, and baronial seats are
  stronger candidates for grant, but candidacy is not the right itself

## Royal Forest

v0.1 rule family:

- `forest_overlay_status = active | inactive`
- forest overlay does not change the underlying land title
- forest overlay restricts hunting, timber or woodland exploitation, and other
  use in coarse form
- forest overlay introduces special fines and special jurisdiction in coarse
  form
- overlay may lie over crown, baronial, comital, minor, or church-held land

What forest overlay is not:

- not a synonym for all woodland
- not an ownership transfer
- not a detailed sub-rights system in v0.1

## Provisional `holding_fabric_v2` Field Recommendations

These are recommended future fields, not part of `holding_fabric_v1`.

- `immediate_lord_actor_id`
- `superior_lord_actor_id`
- `tenure_basis`
- `tenure_depth`
- `jurisdiction_bundle`
- `franchise_bundle`
- `forest_overlay_status`
- `vacancy_rule_family`
- `church_holder_kind`
- `holder_actor_id`
- `holder_actor_type`

Recommended enums:

- `tenure_basis = crown_demesne | baronial_tenure | lay_fee | county_office_demesne | church_temporalities | other`
- `vacancy_rule_family = none | lay_wardship | lay_escheat | ecclesiastical_temporalities_in_hand | crown_regrant`

## Open Questions

1. Should some bishoprics or abbeys later hold baronies explicitly, or should
   baronial-scale church land remain modeled only through `church_fief` plus
   holder metadata?
2. Should `county_domain` later split into seat precinct versus dispersed comital
   demesne, or remain one coarse class?
3. How much of lay service should stay in coarse families versus distinct
   `knight_service`, `serjeanty`, `frankalmoin`, and similar tenure bases?
4. How should parish benefices be represented once parish institutions become
   first-class actors?
5. Should forest overlay later distinguish crown forest from other protected
   legal woodland overlays, or remain a single coarse family?
6. How should franchises be granted, revoked, inherited, or held during
   ecclesiastical vacancy?
7. When later actor graphs exist, which layers should become actor-to-actor
   relationships and which should remain map overlays only?

## Research Notes

This v0.1 note is informed by:

- Magna Carta style limits and incident framing for relief, wardship, marriage,
  and widow protection
- Bracton-era treatment of homage, wardship, and marriage
- the investiture-era distinction between temporalities and spiritual office
- the charter-and-grant basis of markets and fairs
- the Charter of the Forest tradition, which treats royal forest as a legal
  overlay rather than a simple terrain category

Useful source links:

- [Harvard Law School Library, Bracton Online, Volume 2 Page 259](https://amesfoundation.law.harvard.edu/Bracton/Unframed/English/v2/259.htm)
- [Harvard Ames Foundation, English Legal History Seminar notes on feudal incidents](https://amesfoundation.law.harvard.edu/lhsemelh/lectures/s02.out.pdf)
- [Britannica, Investiture Controversy](https://www.britannica.com/event/Investiture-Controversy)
- [Institute of Historical Research, Summary of Research Results: Markets and Fairs in Thirteenth-Century England](https://archives.history.ac.uk/ihrcms/cmh/assets/sites/history.ac.uk/files/EoA_Report_Results.pdf)


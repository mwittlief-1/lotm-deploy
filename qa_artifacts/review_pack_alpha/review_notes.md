# Review Notes

- total manor count target used by the algorithm: `387`
- target hexes per rural manor: `20`
- elite spacing rules summary: `royal_seat 0`, `royal_castle 8`, `county_seat 10`, `bishop_seat 8`, `abbey_site 7`, `baronial_seat 6`
- holding types in this pack: `barony`=275, `church_fief`=66, `county_domain`=6, `crown_domain`=40
- legal rule version: `holding_fabric_legal_rules_v0_1`
- known caveats: county IDs are now read from holding_fabric/manor_units when present; legacy map overlay is only used as a fallback for older artifacts; elite_complex_count counts only final elite seat complexes; elite_sites.csv includes elite complexes plus strategic rural seat nodes (121 vs 143); oversized_splits_attempted is 15; count is persisted directly from the split pass
- Current World Context v1 guardrails: counties `15`, bishoprics `8`, baronial seats `45-75`, abbeys `30-60`, manor band `300-500`

# Simulation Phases

This directory is the target home for thin phase wrappers extracted from `src/sim/turn.ts`.

Target order:
1. `phase_demography`
2. `phase_marriage`
3. `phase_consumption`
4. `phase_obligations`
5. `phase_events`
6. `phase_succession`

Rule: phases own execution order, not domain meaning.


# Product Requirements Document 

---

## Purpose & Objectives

This project delivers a planning and simulation tool that generates optimal weekly schedules for replacing legacy (2023-generation) data centre racks with 2025-generation models across a multi-building facility, while never violating power or service-level constraints.

The primary objective is to maximise power headroom—freeing capacity for increased compute—by producing a day-by-day movement plan that respects operational limits (32 racks/day, minimum RSU thresholds, suite/building power caps). 

A secondary, configurable objective targets green computing: reducing total power consumption while preserving the same compute/storage/AI footprint. The tool must allow operators to select and weight these competing goals.

## Background

Meta's data centre infrastructure operates racks across three service types (compute, storage, AI) spanning generations 2023–2025, housed in a topology of buildings → suites → rows → positions. 

Each suite contains 48 rows × 16 positions (768 slots), powered at up to 12.5 MW with a 0.5 MW emergency buffer. Currently, 44 rows are populated with a fixed mix of 2023 and 2024 racks and 4 rows are empty. 

Newer-generation racks deliver substantially higher RSU output per kilowatt (e.g., c25 produces 2.8 RSU at 19 kW vs c23's 1.0 RSU at 11 kW), making replacement attractive but logistically constrained. 

## Stakeholders

The primary stakeholders are the Meta industry mentors (Eoin O'Kane, John Kelly, Gonzalo de la Cruz Fernandez, Tomasz Stachowski) who defined the problem, will evaluate the deliverable, and represent the end-user perspective of data centre capacity planners. The student development team (Saanvi, Kai, Narottam, Parsia, Aine, Liam, Ishaan, Neil) is responsible for design, implementation, and delivery. Academic oversight is provided by Dr. Inmaculada Arnedillo-Sánchez (module coordinator) and demonstrator Kim Nolle, who monitor progress and assess coursework deliverables.

---

## User Stories & Use Cases

1. **As a capacity planner**, I want to load an existing cluster plan JSON file so that the system initialises the current state of all racks, positions, and constraints.
2. **As a capacity planner**, I want to generate a weekly rack replacement schedule so that all 2023 racks are replaced with 2025 models without breaching service minimums.
3. **As a capacity planner**, I want to select between "maximise power headroom" and "minimise power usage (green)" optimisation modes so that I can pursue different operational goals.
4. **As a capacity planner**, I want to weight the trade-off between headroom and green goals using a configurable parameter so that I can find a balanced sweet spot.
5. **As a capacity planner**, I want to view the day-by-day movement plan showing exactly which racks move from/to which positions so that I can execute the plan operationally.
6. **As a capacity planner**, I want the system to guarantee that compute, storage, and AI RSU never drop below minimums (388, 166, 145) at any point during execution so that service outages are avoided.
7. **As a capacity planner**, I want to see per-row and per-suite power distribution at each step so that I can verify even power balancing.
8. **As a capacity planner**, I want to visualise the datacenter/suite grid state before, during, and after the replacement process so that I can understand rack layout changes.
9. **As a capacity planner**, I want to adjust constraints (e.g., timeline length, movement capacity, minimum RSU thresholds) so that I can model alternative scenarios such as a 9-month rollout.
10. **As a capacity planner**, I want to see weekly summary reports of total power usage, RSU by service type, and generation distribution so that I can track progress.
11. **As a capacity planner**, I want the system to handle mixed-generation input plans (2023-only, 2023+2024, 2023+2024+2025, overpower scenarios) so that it works across different starting states.
12. **As a capacity planner**, I want the system to enforce that 4 rows remain empty at all times so that operational buffer space is preserved.

---

## Functional Requirements

### JSON Cluster Plan Parser
- Ingests `cluster-plan-*.json` files matching the provided schema (`constraints`, `rack_types`, `cluster_plans`).
- Parses rack type definitions (code, generation, power kW, RSU output) and populates the domain model.
- Handles all provided variants: single-generation, mixed-generation, and overpower plans.
- Validates input structure and reports parsing errors.

### Domain Model (Grid State)
- Represents the full topology: Datacenter (tcd1–tcd4) → Suite (A–D) → Row (1–48) → Position (1–16) → Rack.
- Each rack stores: type code, generation, power draw (kW), RSU output, service type (compute/storage/AI).
- Each row tracks: aggregate power, 85% headroom target, rack count.
- Each suite tracks: total power usage (≤12.5 MW usable, 0.5 MW emergency buffer), aggregate RSU by service type.
- Each datacenter tracks: total power (≤50 MW).
- GridState provides a snapshot of all positions and computed aggregates (total power, compute/storage/AI RSU).

### Constraint Validator
- **Power constraints**: Suite ≤ 12.5 MW (hard), building ≤ 50 MW (hard), emergency buffer 0.5 MW (soft, max 1 week).
- **RSU constraints**: Compute ≥ 388, Storage ≥ 166, AI ≥ 145 (hard minimums — violation = service outage). Compute ≤ 500, Storage ≤ 200, AI ≤ 250 (soft maximums — temporary exceedance permitted under emergency rules).
- **Operational constraints**: ≤ 32 rack movements per day; cannot move a rack into an occupied position; 4 rows must remain empty at all times; removed 2023 racks are permanently disposed.
- Validates every intermediate state (each day) during schedule simulation. Rejects any plan that violates hard constraints at any point.

### Heuristic/Linear Planner
- Accepts the current GridState and target goal configuration.
- **Headroom mode**: Maximise available power capacity by optimising rack replacement order and placement to free the most power headroom as early as possible.
- **Green mode**: Minimise total power consumption while maintaining the same or better compute/storage/AI RSU output.
- **Weighted mode**: Accept a weight parameter to blend both objectives; leverage linear programming to find the Pareto-optimal trade-off.
- Outputs an ordered sequence of daily move operations.
- Respects all constraint validator rules during plan generation.

### Day-by-Day Simulator
- Executes the planner's output step-by-step (day by day).
- Updates GridState after each day's moves.
- Calls constraint validator on each intermediate state.
- Records: positions updated, racks removed, racks placed, power/RSU snapshot per day.
- Feeds updated positions back to GridState.

### Schedule & Output Generator
- Produces a weekly schedule grouping daily moves.
- Outputs per-day move lists: source position, rack removed, destination position, rack placed.
- Generates summary reports: total power usage, RSU by type, generation distribution, power per row.
- Supports datacenter/suite-level views.

### User Interface (CLI and/or Web)
- **Input flow**: User loads a JSON cluster plan → selects optimisation mode (headroom/green/weighted) → optionally adjusts constraints → runs planner.
- **Output flow**: Displays the generated schedule, day-by-day move list, grid visualisation, and power/RSU reports.
- Provides grid visualisation of rack layout (rack types colour-coded by generation/service).
- Allows re-running with adjusted parameters without reloading the plan.

### Configurable Constraints Interface (Stretch)
- Exposes all constraint parameters for user modification: timeline duration, daily move limit, RSU min/max thresholds, power caps, row reservation count.
- Enables scenario modelling (e.g., 9-month extended timeline, reduced daily capacity).

### Even Distribution Across Rows (Stretch)
- Balances compute, storage, and AI rack types evenly across all active rows.
- Power distribution per row should converge toward uniformity as part of the optimisation target.

---

## Non-Functional Requirements

### Usability
- The interface (CLI or web) must be operable without training beyond a README.
- Grid visualisation must render correctly across platforms (terminal colours must work in git-bash; web UI in modern browsers).
- Error messages must clearly identify which constraint was violated and at which step.

### Performance
- Plan generation for a single suite (768 positions) must complete in under 60 seconds on a standard laptop.
- Full 4-building, 16-suite optimisation (if supported) should complete in under 10 minutes.
- Day-by-day simulation playback should render each step in under 1 second.

### Scalability
- The domain model and planner must handle the full topology: 4 datacenters × 4 suites × 48 rows × 16 positions = 12,288 rack positions.
- Constraint parameters and rack type definitions must be data-driven (from JSON), not hardcoded, to support new generations or changed specs.

### Security
- No authentication required (internal planning tool).
- Input validation must reject malformed JSON and out-of-range values to prevent undefined behaviour.

### Reliability
- The system must never produce a schedule that violates hard constraints (power caps, RSU minimums). Correctness of constraint enforcement is the highest priority.
- The simulator must be deterministic: identical inputs and configuration must produce identical outputs.

### Portability & Environment
- Must run on Windows (PowerShell/git-bash), macOS, and Linux.
- Node.js runtime compatibility (aligning with the provided viewer script).
- No external service dependencies; fully offline-capable.

### Green Computing
- The green optimisation mode is a first-class feature, not an afterthought. The system must demonstrate measurable power reduction in green mode compared to a naive replacement strategy while holding RSU output constant.

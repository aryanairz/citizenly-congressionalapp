/**
 * Shape of one "place" in the personalized-question data: a U.S. state,
 * Washington D.C., or a U.S. territory.
 *
 * This type lives in its own file (NOT in the auto-generated representatives.ts)
 * so both the generated state data and the hand-maintained territories data
 * share one definition and the weekly generator can't revert it.
 */
export interface StateData {
  name: string;
  /** Defaults to "state" when omitted — all 50 states leave this unset. */
  kind?: "state" | "district" | "territory";
  /** Omit for D.C. (not a state → no capital). Territories DO have capitals. */
  capital?: string;
  /** Omit for D.C. (no Governor). States + territories have one. */
  governor?: string;
  /** Omit for D.C. + all territories (they have no U.S. Senators). */
  senators?: [string, string];
  /** district # → representative name. Empty {} for D.C./territories (no voting Rep). */
  districts: Record<number, string>;
}

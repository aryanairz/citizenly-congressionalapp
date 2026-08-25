import type { StateData } from "@/data/state-data-types";

/**
 * Washington, D.C. and the 5 U.S. territories.
 *
 * HAND-MAINTAINED — NOT touched by scripts/update-representatives.js (that
 * generator only rewrites the 50 states in representatives.ts). Territory/D.C.
 * residents can naturalize, and USCIS has specific civics answers for them.
 *
 * Officials verified against the National Governors Association current list.
 * D.C. has no Governor / Senators / capital / voting Representative.
 * Territories have Governors + capitals but no Senators / no voting Representative.
 */
export const territoryData: Record<string, StateData> = {
  DC: {
    name: "Washington, D.C.",
    kind: "district",
    districts: {},
  },
  PR: {
    name: "Puerto Rico",
    kind: "territory",
    governor: "Jenniffer González-Colón",
    capital: "San Juan",
    districts: {},
  },
  GU: {
    name: "Guam",
    kind: "territory",
    governor: "Lou Leon Guerrero",
    capital: "Hagåtña",
    districts: {},
  },
  VI: {
    name: "the U.S. Virgin Islands",
    kind: "territory",
    governor: "Albert Bryan",
    capital: "Charlotte Amalie",
    districts: {},
  },
  AS: {
    name: "American Samoa",
    kind: "territory",
    governor: "Pula'ali'i Nikolao Pula",
    capital: "Pago Pago",
    districts: {},
  },
  MP: {
    name: "the Northern Mariana Islands",
    kind: "territory",
    governor: "David M. Apatang",
    capital: "Saipan",
    districts: {},
  },
};

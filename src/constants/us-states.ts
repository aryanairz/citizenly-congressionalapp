/**
 * The 50 US states (alphabetical), followed by Washington, D.C. and the US
 * territories. `code` matches the website's place keys (sent to
 * /api/personalized-questions); `kind` marks places without congressional
 * districts so the district field can hide.
 *
 * `districtCount` is derived from the website's representatives data
 * (data/representatives.ts - sums to 435) and caps the district input.
 * Count of 1 = at-large state: the district question is skipped and the
 * at-large key (0) is stored automatically.
 */

export interface USPlace {
  name: string;
  code: string;
  /** Defaults to 'state' - only DC ('district') and territories differ. */
  kind?: 'district' | 'territory';
  /** Number of congressional districts; omitted for DC/territories. */
  districtCount?: number;
}

export const US_STATES: readonly USPlace[] = [
  { name: 'Alabama', code: 'AL', districtCount: 7 },
  { name: 'Alaska', code: 'AK', districtCount: 1 },
  { name: 'Arizona', code: 'AZ', districtCount: 9 },
  { name: 'Arkansas', code: 'AR', districtCount: 4 },
  { name: 'California', code: 'CA', districtCount: 52 },
  { name: 'Colorado', code: 'CO', districtCount: 8 },
  { name: 'Connecticut', code: 'CT', districtCount: 5 },
  { name: 'Delaware', code: 'DE', districtCount: 1 },
  { name: 'Florida', code: 'FL', districtCount: 28 },
  { name: 'Georgia', code: 'GA', districtCount: 14 },
  { name: 'Hawaii', code: 'HI', districtCount: 2 },
  { name: 'Idaho', code: 'ID', districtCount: 2 },
  { name: 'Illinois', code: 'IL', districtCount: 17 },
  { name: 'Indiana', code: 'IN', districtCount: 9 },
  { name: 'Iowa', code: 'IA', districtCount: 4 },
  { name: 'Kansas', code: 'KS', districtCount: 4 },
  { name: 'Kentucky', code: 'KY', districtCount: 6 },
  { name: 'Louisiana', code: 'LA', districtCount: 6 },
  { name: 'Maine', code: 'ME', districtCount: 2 },
  { name: 'Maryland', code: 'MD', districtCount: 8 },
  { name: 'Massachusetts', code: 'MA', districtCount: 9 },
  { name: 'Michigan', code: 'MI', districtCount: 13 },
  { name: 'Minnesota', code: 'MN', districtCount: 8 },
  { name: 'Mississippi', code: 'MS', districtCount: 4 },
  { name: 'Missouri', code: 'MO', districtCount: 8 },
  { name: 'Montana', code: 'MT', districtCount: 2 },
  { name: 'Nebraska', code: 'NE', districtCount: 3 },
  { name: 'Nevada', code: 'NV', districtCount: 4 },
  { name: 'New Hampshire', code: 'NH', districtCount: 2 },
  { name: 'New Jersey', code: 'NJ', districtCount: 12 },
  { name: 'New Mexico', code: 'NM', districtCount: 3 },
  { name: 'New York', code: 'NY', districtCount: 26 },
  { name: 'North Carolina', code: 'NC', districtCount: 14 },
  { name: 'North Dakota', code: 'ND', districtCount: 1 },
  { name: 'Ohio', code: 'OH', districtCount: 15 },
  { name: 'Oklahoma', code: 'OK', districtCount: 5 },
  { name: 'Oregon', code: 'OR', districtCount: 6 },
  { name: 'Pennsylvania', code: 'PA', districtCount: 17 },
  { name: 'Rhode Island', code: 'RI', districtCount: 2 },
  { name: 'South Carolina', code: 'SC', districtCount: 7 },
  { name: 'South Dakota', code: 'SD', districtCount: 1 },
  { name: 'Tennessee', code: 'TN', districtCount: 9 },
  { name: 'Texas', code: 'TX', districtCount: 38 },
  { name: 'Utah', code: 'UT', districtCount: 4 },
  { name: 'Vermont', code: 'VT', districtCount: 1 },
  { name: 'Virginia', code: 'VA', districtCount: 11 },
  { name: 'Washington', code: 'WA', districtCount: 10 },
  { name: 'West Virginia', code: 'WV', districtCount: 2 },
  { name: 'Wisconsin', code: 'WI', districtCount: 8 },
  { name: 'Wyoming', code: 'WY', districtCount: 1 },
  // Federal district and US territories, kept after the states.
  { name: 'Washington, D.C.', code: 'DC', kind: 'district' },
  { name: 'Puerto Rico', code: 'PR', kind: 'territory' },
  { name: 'Guam', code: 'GU', kind: 'territory' },
  { name: 'U.S. Virgin Islands', code: 'VI', kind: 'territory' },
  { name: 'American Samoa', code: 'AS', kind: 'territory' },
  { name: 'Northern Mariana Islands', code: 'MP', kind: 'territory' },
];

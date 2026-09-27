/**
 * USCIS English-language exemption options ("50/20", "55/15", "65/20").
 * The 65/20 exemption also means a shorter 20-question civics list - it maps to
 * the `is6520` flag / `?set=6520` param on the questions API.
 */

export type ExemptionChoice = '50/20' | '55/15' | '65/20' | 'unsure';

export interface ExemptionOption {
  id: ExemptionChoice;
  title: string;
  description: string;
}

export const EXEMPTIONS: readonly ExemptionOption[] = [
  {
    id: '50/20',
    title: '50/20: Age 50+, 20 years',
    description: 'You are 50 or older and have lived in the US as a green card holder for 20 years.',
  },
  {
    id: '55/15',
    title: '55/15: Age 55+, 15 years',
    description: 'You are 55 or older and have lived in the US as a green card holder for 15 years.',
  },
  {
    id: '65/20',
    title: '65/20: Age 65+, 20 years',
    description: 'You are 65 or older and have lived in the US as a green card holder for 20 years.',
  },
  {
    id: 'unsure',
    title: "I'm not sure",
    description: "No problem - we'll help you figure this out later.",
  },
];

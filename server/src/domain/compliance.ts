/**
 * Compliance engine — the part that makes "order anything" safe and lawful.
 *
 * The model never decides what is allowed. This module does, in code, before a
 * request is created and again before it is confirmed. Rules are ordered:
 *
 *   block  → never allowed (illegal / prohibited)
 *   gate   → allowed only after a verifiable condition (age, licence, city)
 *   allow  → proceed, but attach provider-side requirements
 *
 * Everything here is demo-grade but the rule structure is production-shaped:
 * a real deployment would load policies from the compliance_policies table and
 * record every decision in compliance_checks (see migration 002).
 */

import type { CategoryDefinition, ComplianceProfile } from './taxonomy.js';

export type ComplianceDecisionType = 'allow' | 'gate' | 'block';

export interface ComplianceDecision {
  decision: ComplianceDecisionType;
  code: string;
  message: string;
  /** Things the customer must do before this can proceed. */
  required_actions: string[];
  /** Things the provider must hold before they may fulfil it. */
  provider_requirements: string[];
  matched: string[];
}

export interface CustomerContext {
  ageVerified?: boolean;
  dateOfBirth?: string;
}

export interface ComplianceInput {
  text?: string;
  category?: CategoryDefinition | null;
  attributes?: Record<string, unknown>;
  customer?: CustomerContext;
  city?: string;
  provider?: {
    verificationStatus?: string;
    licenceVerified?: boolean;
    licenceType?: string;
  };
  now?: Date;
}

export const PILOT_CITIES = ['Bengaluru', 'Bangalore'];

/** Platform policy floor — deliberately configurable, not a legal claim. */
export const PLATFORM_MIN_HOURLY_INR = 100;
export const PLATFORM_MAX_HOURS = 12;

interface ProhibitedRule {
  code: string;
  label: string;
  patterns: RegExp[];
  message: string;
}

/**
 * Phrases that contain a banned word but are legal goods. They are neutralised
 * before scanning so "glue gun" and "toy gun" don't get blocked.
 */
const NEUTRALISED_PHRASES: RegExp[] = [
  /\bglue\s+gun(s)?\b/gi,
  /\bnail\s+gun(s)?\b/gi,
  /\btoy\s+gun(s)?\b/gi,
  /\bwater\s+gun(s)?\b/gi,
  /\bpaintball\s+gun(s)?\b/gi,
  /\bnerf\s+gun(s)?\b/gi,
  /\bheat\s+gun(s)?\b/gi,
  /\bstaple\s+gun(s)?\b/gi,
  /\bsoldering\s+gun(s)?\b/gi,
  /\bcaulking\s+gun(s)?\b/gi,
  /\bspray\s+gun(s)?\b/gi,
];

export const PROHIBITED_RULES: ProhibitedRule[] = [
  {
    code: 'prohibited_firearms',
    label: 'Firearms, ammunition and weapons',
    patterns: [
      /\b(handgun|firearm|pistol|revolver|rifle|shotgun|ammunition|ammo|silencer|suppressor|glock|uzi|ak-?47|machine\s+gun|assault\s+rifle)\b/i,
      /\bgun\b/i,
      /\b(gun|weapon)\s+(dealer|shop|seller|broker)\b/i,
    ],
    message:
      "I can't broker firearms or ammunition. Unlicensed sale and transfer is a criminal offence under India's Arms Act, 1959, and licensed dealers trade only through the regulated licensing process. I can't connect you with a dealer for this.",
  },
  {
    code: 'prohibited_explosives',
    label: 'Explosives',
    patterns: [/\b(bomb|grenade|tnt|rdx|detonator|explosive|ied|pipe\s+bomb)\b/i],
    message: "I can't help with explosives or explosive devices.",
  },
  {
    code: 'prohibited_narcotics',
    label: 'Illegal narcotics',
    patterns: [
      /\b(cocaine|heroin|methamphetamine|meth|mdma|ecstasy|lsd|ganja|marijuana|cannabis|hashish|opium|fentanyl)\b/i,
    ],
    message:
      "I can't help buy or sell illegal narcotics. That's a criminal offence under the NDPS Act.",
  },
  {
    code: 'prohibited_wildlife',
    label: 'Wildlife and protected animal products',
    patterns: [/\b(ivory|rhino\s+horn|tiger\s+skin|pangolin|shahtoosh|wildlife\s+trade)\b/i],
    message: "I can't help with wildlife products — that trade is banned under the Wildlife Protection Act.",
  },
  {
    code: 'prohibited_organs',
    label: 'Human organs and trafficking',
    patterns: [
      /\b(sell|buy|purchase)\s+(me\s+)?(a\s+|my\s+)?(kidney|liver|cornea|organ)\b/i,
      /\b(human\s+trafficking|trafficking\s+people|smuggle\s+people)\b/i,
    ],
    message: "I can't help with organ sales or human trafficking. Both are serious criminal offences.",
  },
  {
    code: 'prohibited_documents',
    label: 'Forged documents',
    patterns: [
      /\b(fake|forged|counterfeit)\s+(passport|aadhaar|aadhar|id\s+card|driving\s+licen[cs]e|degree|certificate|visa|rc)\b/i,
    ],
    message:
      "I can't help with forged or fake documents. I can point you to the official process for a genuine one instead.",
  },
  {
    code: 'prohibited_surveillance',
    label: 'Hacking and surveillance of other people',
    patterns: [
      /\b(hack|breach)\s+(into\s+)?(someone|somebody|my\s+(wife|husband|partner|ex|girlfriend|boyfriend)|instagram|facebook|whatsapp|email|phone|account)\b/i,
      /\b(spy\s+on|stalk)\s+(someone|somebody|my\s+(wife|husband|partner|ex|girlfriend|boyfriend))\b/i,
    ],
    message:
      "I can't help access someone else's accounts or track a person without consent. That's a privacy offence under the IT Act.",
  },
  {
    code: 'prohibited_sexual_services',
    label: 'Sexual services',
    patterns: [/\b(prostitution|escort\s+service|sex\s+worker|brothel|happy\s+ending)\b/i],
    message: "I can't help with sexual services or brokering them.",
  },
  {
    code: 'prohibited_gambling',
    label: 'Gambling and betting',
    patterns: [/\b(betting|bet\s+on|casino|satta|matka|poker\s+for\s+cash)\b/i],
    message:
      "I can't help with betting or gambling services. Online gambling is restricted in Karnataka.",
  },
  {
    code: 'prohibited_violence',
    label: 'Violence for hire',
    patterns: [/\b(hitman|contract\s+kill\w*|assassin|murder\s+for\s+hire|kidnap\w*)\b/i],
    message: "I can't help with this.",
  },
  {
    code: 'prohibited_counterfeit',
    label: 'Counterfeit branded goods',
    patterns: [
      /\b(fake|replica|first\s+copy|counterfeit)\s+(rolex|watch|bag|shoes?|iphone|nike|adidas|gucci|prada|louis\s+vuitton|dyson)\b/i,
      /\bcounterfeit\s+(goods|products)\b/i,
    ],
    message:
      "I can't source counterfeit branded goods. I can find you genuine or legitimate unbranded alternatives.",
  },
  {
    code: 'prohibited_child_labour',
    label: 'Child labour',
    patterns: [/\b(child\s+labour|child\s+labor|hire\s+a\s+child|kid\s+to\s+work|underage\s+worker)\b/i],
    message: "I can't arrange child labour. That's prohibited under the Child Labour (Prohibition and Regulation) Act.",
  },
];

function neutralise(text: string): string {
  let out = text;
  for (const re of NEUTRALISED_PHRASES) out = out.replace(re, ' [tool] ');
  return out;
}

export function scanProhibited(text: string): { code: string; message: string; matched: string[] } | null {
  const cleaned = neutralise(text);
  for (const rule of PROHIBITED_RULES) {
    const matched: string[] = [];
    for (const re of rule.patterns) {
      const m = cleaned.match(re);
      if (m) matched.push(m[0]);
    }
    if (matched.length > 0) {
      return { code: rule.code, message: rule.message, matched };
    }
  }
  return null;
}

function ageFromDob(dob: string | undefined, now: Date): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - d.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

/** Extract a rate like "50 rs per hour", "₹200/hour", "for 80 rupees". */
export function extractHourlyRate(text: string): number | null {
  const re = /(?:₹|rs\.?|inr)?\s*(\d{2,6})\s*(?:rs\.?|rupees|inr)?\s*(?:\/|per\s+)?\s*(?:hour|hr|hrs)\b/i;
  const m = text.match(re);
  if (m) return Number(m[1]);
  const plain = /(?:₹|rs\.?|inr)\s*(\d{2,6})\b/i.exec(text);
  return plain ? Number(plain[1]) : null;
}

export function checkCompliance(input: ComplianceInput): ComplianceDecision {
  const now = input.now ?? new Date();
  const city = input.city ?? 'Bengaluru';
  const category = input.category ?? null;
  const text = input.text ?? '';
  const attributes = input.attributes ?? {};

  // 1. Prohibited content always wins, even if a category matched.
  if (text) {
    const hit = scanProhibited(text);
    if (hit) {
      return {
        decision: 'block',
        code: hit.code,
        message: hit.message,
        required_actions: [],
        provider_requirements: [],
        matched: hit.matched,
      };
    }
  }

  // 2. Category-level prohibition.
  if (category && category.compliance === 'prohibited') {
    return {
      decision: 'block',
      code: 'prohibited_category',
      message: category.legalNote ?? "This category isn't allowed on the platform.",
      required_actions: [],
      provider_requirements: [],
      matched: [category.slug],
    };
  }

  // 3. Pilot jurisdiction.
  if (!PILOT_CITIES.some((c) => c.toLowerCase() === city.toLowerCase())) {
    return {
      decision: 'gate',
      code: 'outside_pilot_city',
      message: `The pilot only serves Bengaluru right now. I can't book in ${city} yet.`,
      required_actions: ['wait_for_city_expansion'],
      provider_requirements: [],
      matched: [city],
    };
  }

  // 4. Age gate.
  if (category?.minAge) {
    const age = ageFromDob(input.customer?.dateOfBirth, now);
    const verified = input.customer?.ageVerified === true || (age !== null && age >= category.minAge);
    if (!verified) {
      return {
        decision: 'gate',
        code: 'age_verification_required',
        message: `This category is ${category.minAge}+. I need age verification before we go further.`,
        required_actions: [`verify_age_${category.minAge}`],
        provider_requirements: [category.licenceType ?? 'age-restricted retail licence'],
        matched: [category.slug],
      };
    }
  }

  // 5. Labour floor + working-hours ceiling.
  if (category?.slug === 'general_labour' || category?.pricing === 'hourly') {
    const stated = extractHourlyRate(text) ?? toNumber(attributes.hourly_rate);
    if (stated !== null && stated < PLATFORM_MIN_HOURLY_INR) {
      return {
        decision: 'block',
        code: 'below_minimum_rate',
        message:
          `₹${stated}/hour is below the platform floor of ₹${PLATFORM_MIN_HOURLY_INR}/hour. ` +
          'I can find you a verified worker at or above that rate, but I won\'t book below it.',
        required_actions: [],
        provider_requirements: [],
        matched: [`₹${stated}/hr`],
      };
    }

    const hours = toNumber(attributes.hours);
    if (hours !== null && hours > PLATFORM_MAX_HOURS) {
      return {
        decision: 'gate',
        code: 'shift_too_long',
        message: `I can't book a single shift longer than ${PLATFORM_MAX_HOURS} hours. Split it into two bookings.`,
        required_actions: ['split_booking'],
        provider_requirements: [],
        matched: [`${hours} hours`],
      };
    }
  }

  // 6. Category not enabled in this pilot (licensed integrations missing).
  if (category && !category.transactable) {
    return {
      decision: 'gate',
      code: 'category_not_enabled',
      message:
        category.legalNote ??
        "This category needs a licensed partner integration that isn't live yet, so I can't take a booking for it.",
      required_actions: ['licensed_partner_required'],
      provider_requirements: category.licenceType ? [category.licenceType] : [],
      matched: [category.slug],
    };
  }

  // 7. Licensed categories are allowed for the customer, gated for providers.
  const providerRequirements: string[] = [];
  if (category?.licenceType) providerRequirements.push(category.licenceType);

  return {
    decision: 'allow',
    code: 'allowed',
    message: 'Allowed.',
    required_actions: [],
    provider_requirements: providerRequirements,
    matched: category ? [category.slug] : [],
  };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Provider-side eligibility. Called when a provider tries to accept work.
 */
export function checkProviderEligibility(input: {
  category: Pick<CategoryDefinition, 'slug' | 'compliance' | 'licenceType'>;
  provider: {
    verificationStatus?: string;
    licenceVerified?: boolean;
    licenceType?: string;
  };
}): ComplianceDecision {
  const { category, provider } = input;

  if (provider.verificationStatus !== 'verified') {
    return {
      decision: 'gate',
      code: 'provider_not_verified',
      message: 'Provider verification is not complete.',
      required_actions: ['complete_provider_verification'],
      provider_requirements: [],
      matched: [provider.verificationStatus ?? 'unknown'],
    };
  }

  const needsLicence = category.compliance === 'licensed_goods' || category.compliance === 'licensed_service';
  if (needsLicence && !provider.licenceVerified) {
    return {
      decision: 'gate',
      code: 'provider_licence_missing',
      message: `This category needs a verified licence: ${category.licenceType ?? 'applicable licence'}.`,
      required_actions: ['verify_provider_licence'],
      provider_requirements: category.licenceType ? [category.licenceType] : [],
      matched: [category.slug],
    };
  }

  return {
    decision: 'allow',
    code: 'provider_allowed',
    message: 'Provider eligible.',
    required_actions: [],
    provider_requirements: [],
    matched: [category.slug],
  };
}

export function complianceProfileLabel(profile: ComplianceProfile): string {
  switch (profile) {
    case 'none':
      return 'No special compliance';
    case 'age_gated':
      return 'Age-restricted (21+)';
    case 'licensed_goods':
      return 'Licensed goods';
    case 'licensed_service':
      return 'Licensed service';
    case 'prohibited':
      return 'Prohibited';
  }
}


import { Item, Location, CharacterClass, Faction, FactionName, LocationName, ItemCategory, DailyChallenge } from './types';

export const INITIAL_CASH = 2000;
export const INITIAL_DEBT = 2000;
export const GAME_DURATION_DAYS = 30;
export const MAX_INVENTORY = 100;
export const INTEREST_RATE = 0.1;

export const LOAN_OFFERS = [
  { amount: 5000, interest: 0.15 },
  { amount: 10000, interest: 0.20 },
  { amount: 20000, interest: 0.25 },
];

export const DAILY_CHALLENGE_TEMPLATES = [
  {
    type: 'SELL_VALUE',
    description: (target: number, _item?: string) => `Sell ${formatCurrency(target)} worth of any product today.`,
    targetRange: [5000, 15000],
    reward: { type: 'cash', amount: 1000 },
  },
  {
    type: 'PROFIT_FROM',
    description: (target: number, item?: string) => `Make ${formatCurrency(target)} profit from ${item} sales.`,
    targetRange: [1000, 5000],
    itemCategories: ['Party', 'Stimulant', 'Psychedelic'],
    reward: { type: 'rep', amount: 10 },
  },
  {
      type: 'PAY_DEBT',
      description: (target: number, _item?: string) => `Pay off ${formatCurrency(target)} of your debt today.`,
      targetRange: [1000, 5000],
      reward: { type: 'cash', amount: 500},
  }
] as const;

export const FACTION_NAMES: FactionName[] = ["Jelly's Crew", "College Network", "Music Industry", "Tourist Trade", "Street Dealers"];

export const CHARACTER_CLASSES: CharacterClass[] = [
  {
    name: "Ex-Musician",
    description: "You came to Nashville with a guitar and a dream. The dream died, but you still know people on Music Row.",
    perk: "+20% Music Industry rep, +10% creative drug profits.",
    initialRep: { "Music Industry": 20 }
  },
  {
    name: "College Dropout",
    description: "You were studying at Vanderbilt before you realized there was more money in extracurriculars. You know the campus scene well.",
    perk: "+20% College Network rep, +15% student market access.",
    initialRep: { "College Network": 20 }
  },
  {
    name: "Bartender",
    description: "You've been serving drinks to tourists on Broadway for years. You know what they want and how to talk to them.",
    perk: "+20% Tourist Trade rep, deals on party drugs.",
    initialRep: { "Tourist Trade": 20 }
  },
  {
    name: "Mechanic",
    description: "You fix cars and make connections. The street-level dealers trust a good mechanic.",
    perk: "+20% Street Dealers rep, better prices on gear.",
    initialRep: { "Street Dealers": 20 }
  }
];

export const FACTIONS: Faction[] = [
    { name: "Jelly's Crew", locations: ["Downtown", "East Nashville"] },
    { name: "Music Industry", locations: ["Music Row", "The Gulch"] },
    { name: "College Network", locations: ["Murfreesboro", "Antioch"] },
    { name: "Tourist Trade", locations: ["Downtown", "The Gulch"] },
    { name: "Street Dealers", locations: ["Germantown", "Clarksville", "Franklin"] }
];

export const HEAT_LEVELS = [
    { level: 0, description: "Clear. Cops aren't looking for you." },
    { level: 1, description: "Noticed. Local cops are aware of new activity." },
    { level: 2, description: "Known. Patrols are more frequent in your area." },
    { level: 3, description: "Hunted. Risk of shakedowns and targeted patrols." },
    { level: 4, description: "Burned. A task force is actively investigating you." },
    { level: 5, description: "Kingpin. The entire city's law enforcement wants you." },
];


export const ITEMS: Item[] = [
  { name: "Ludes", basePrice: 40, category: 'Depressant' },
  { name: "Crack", basePrice: 150, category: 'Street' },
  { name: "Xanax", basePrice: 180, category: 'Depressant' },
  { name: "Weed", basePrice: 200, category: 'Psychedelic' },
  { name: "GHB", basePrice: 220, category: 'Party' },
  { name: "Speed", basePrice: 250, category: 'Stimulant' },
  { name: "Hashish", basePrice: 450, category: 'Psychedelic' },
  { name: "Shrooms", basePrice: 500, category: 'Psychedelic' },
  { name: "Molly", basePrice: 600, category: 'Party' },
  { name: "PCP", basePrice: 750, category: 'Street' },
  { name: "Ketamine", basePrice: 850, category: 'Party' },
  { name: "Opium", basePrice: 900, category: 'Depressant' },
  { name: "Acid", basePrice: 1000, category: 'Psychedelic' },
  { name: "DMT", basePrice: 2000, 'category': 'Psychedelic' },
  { name: "Cocaine", basePrice: 15000, category: 'Stimulant' },
  { name: "Heroin", basePrice: 25000, category: 'Depressant' },
  { name: "Fentanyl", basePrice: 35000, category: 'Street' },
];

export const LOCATIONS: Location[] = [
  { name: "Downtown", description: "Broadway - Tourist traps & honky-tonks." },
  { name: "East Nashville", description: "Hip cafes hiding dark secrets." },
  { name: "The Gulch", description: "Upscale condos, upscale problems." },
  { name: "Germantown", description: "Historic charm, modern price tags." },
  { name: "Antioch", description: "The sprawling, unpredictable suburbs." },
  { name: "Murfreesboro", description: "A college town with a thirsty market." },
  { name: "Franklin", description: "Old money and new opportunities." },
  { name: "Clarksville", description: "A military town with strict enforcement." },
  { name: "Music Row", description: "Record labels and dreams of stardom." },
];

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

// --- DEMAND SYSTEM CONSTANTS ---
export const DAY_OF_WEEK_DEMAND: Record<number, ItemCategory[]> = {
    0: ['Psychedelic', 'Depressant'], // Sunday
    1: ['Stimulant', 'Depressant'],   // Monday
    2: ['Stimulant'],                 // Tuesday
    3: ['Stimulant'],                 // Wednesday
    4: ['Party'],                     // Thursday
    5: ['Party', 'Stimulant'],        // Friday
    6: ['Party', 'Psychedelic'],      // Saturday
};

export const LOCATION_DEMAND: Record<LocationName, Partial<Record<ItemCategory, number>>> = {
    "Downtown": { "Party": 1.5, "Stimulant": 1.2, "Street": 1.1 },
    "East Nashville": { "Psychedelic": 1.6, "Party": 1.2 },
    "The Gulch": { "Party": 1.4, "Stimulant": 1.3 },
    "Germantown": { "Depressant": 1.2, "Stimulant": 1.1 },
    "Antioch": { "Street": 1.3, "Depressant": 1.2 },
    "Murfreesboro": { "Party": 1.4, "Stimulant": 1.3, "Psychedelic": 1.1 },
    "Franklin": { "Depressant": 1.4, "Stimulant": 1.2 },
    "Clarksville": { "Stimulant": 1.3, "Street": 1.2 },
    "Music Row": { "Stimulant": 1.6, "Depressant": 1.2 },
};

export const SPECIAL_EVENTS = [
    { name: "CMA Awards Week", startDay: 5, endDay: 8, demandMultiplier: 2, categories: ['Party', 'Stimulant'], reason: "The CMA Awards are in town, and everyone's looking to celebrate." },
    { name: "Bonnaroo Pre-game", startDay: 12, endDay: 15, demandMultiplier: 3, categories: ['Psychedelic', 'Party'], reason: "Festival-goers are stocking up before heading to the farm." },
    { name: "Finals Week", startDay: 20, endDay: 24, demandMultiplier: 2.5, categories: ['Stimulant', 'Depressant'], reason: "Students are cramming for finals and need an edge... or an escape." },
];
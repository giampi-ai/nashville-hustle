
export enum GameStatus {
  Intro,
  CharacterSelection,
  Playing,
  GameOver,
}

export type LocationName = "Downtown" | "East Nashville" | "The Gulch" | "Germantown" | "Antioch" | "Murfreesboro" | "Franklin" | "Clarksville" | "Music Row";

export interface Location {
  name: LocationName;
  description: string;
}

export type ItemCategory = "Party" | "Stimulant" | "Psychedelic" | "Depressant" | "Street";

export interface Item {
  name:string;
  basePrice: number;
  category: ItemCategory;
}

export type CharacterClassName = "Ex-Musician" | "College Dropout" | "Bartender" | "Mechanic";
export type FactionName = "Jelly's Crew" | "College Network" | "Music Industry" | "Tourist Trade" | "Street Dealers";

export interface CharacterClass {
  name: CharacterClassName;
  description: string;
  perk: string;
  initialRep: Partial<Record<FactionName, number>>;
}

export interface Faction {
  name: FactionName;
  locations: LocationName[];
}

export type ChallengeType = 'SELL_VALUE' | 'PROFIT_FROM' | 'PAY_DEBT';

export interface DailyChallenge {
    type: ChallengeType;
    description: string;
    target: number;
    progress: number;
    item?: string; 
    reward: { type: 'cash' | 'rep'; amount: number; };
    isComplete: boolean;
}

export interface PlayerStats {
    totalDeals: number;
    biggestProfit: number;
    daysSurvived: number;
    heatRecord: number;
}

export interface PlayerState {
  cash: number;
  debt: number;
  inventory: Record<string, { low: number; mid: number; high: number; }>; 
  location: LocationName;
  day: number;
  interestRate: number;
  hasTakenSecondLoan: boolean;
  character: CharacterClass | null;
  heat: number; // 0-5 stars
  reputation: Record<FactionName, number>;
  activeChallenge: DailyChallenge | null;
  stats: PlayerStats;
  searchesToday: number;
}

export enum DemandLevel {
    CRASH,
    LOW,
    MEDIUM,
    HIGH,
    VERY_HIGH,
}

export type MarketData = Record<LocationName, Record<string, {
    low: number;
    mid: number;
    high: number;
    demandLevel: DemandLevel;
    demandReason: string;
}>>;

export interface GameEventAction {
  label: string;
  apply: (playerState: PlayerState) => {
    newState: PlayerState;
    log: string;
  };
}

export interface GameEvent {
  title: string;
  description: string;
  apply?: (playerState: PlayerState) => {
    newState: PlayerState;
    log: string;
  };
  actions?: GameEventAction[];
  isMarketEvent?: boolean;
}


export interface HighScore {
  name: string;
  score: number;
  date: string;
}

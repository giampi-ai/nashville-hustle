
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameStatus, LocationName, PlayerState, MarketData, GameEvent, Item, HighScore, GameEventAction, CharacterClass, FactionName, DemandLevel, DailyChallenge, PlayerStats, ItemCategory, ChallengeType } from './types';
import { INITIAL_CASH, INITIAL_DEBT, GAME_DURATION_DAYS, MAX_INVENTORY, INTEREST_RATE, ITEMS, LOCATIONS, LOAN_OFFERS, CHARACTER_CLASSES, FACTIONS, HEAT_LEVELS, FACTION_NAMES, DAY_OF_WEEK_DEMAND, LOCATION_DEMAND, SPECIAL_EVENTS, DAILY_CHALLENGE_TEMPLATES } from './constants';
import { MapPinIcon, CalendarDaysIcon, BanknotesIcon, ExclamationTriangleIcon, ArchiveBoxIcon, UserIcon, ArrowUpIcon, ArrowDownIcon, PlusIcon, MinusIcon, ScaleIcon, FireIcon, ShieldCheckIcon, UserGroupIcon, StarIcon, MagnifyingGlassIcon, TrophyIcon, ChartBarIcon } from '@heroicons/react/24/solid';

const HIGH_SCORES_KEY = 'nashvilleHustleHighScores';

// --- SOUND MANAGER ---
const SoundManager = {
    audioContext: new (window.AudioContext || (window as any).webkitAudioContext)(),
    sounds: {} as Record<string, AudioBuffer>,

    play(soundName: string) {
        if (!this.audioContext) return;
        const source = this.audioContext.createBufferSource();
        switch(soundName) {
            case 'cash':
                this.createSynthSound(0.5, 'sine', 880, 1046.50);
                break;
            case 'click':
                 this.createSynthSound(0.05, 'triangle', 440, 440);
                break;
            case 'siren':
                 this.createSynthSound(0.2, 'sawtooth', 900, 700);
                 break;
            case 'success':
                this.createSynthSound(0.3, 'sine', 523.25, 1046.50);
                break;
        }
    },
    
    createSynthSound(duration: number, type: OscillatorType, from_freq: number, to_freq: number) {
        if (!this.audioContext) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(from_freq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(to_freq, this.audioContext.currentTime + duration);
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
const getHighScores = (): HighScore[] => JSON.parse(localStorage.getItem(HIGH_SCORES_KEY) || '[]');
const saveHighScores = (scores: HighScore[]) => {
  const sorted = scores.sort((a, b) => b.score - a.score).slice(0, 10);
  localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(sorted));
};

const generateMarketData = (day: number): MarketData => {
  const data: Partial<MarketData> = {};
  const dayOfWeek = (day - 1) % 7;
  const activeEvent = SPECIAL_EVENTS.find(e => day >= e.startDay && day <= e.endDay);

  LOCATIONS.forEach(location => {
    data[location.name] = {};
    ITEMS.forEach(item => {
      let demandScore = 1.0;
      let reason = "The market is stable.";

      // Fluctuation
      demandScore *= (1 + (Math.random() - 0.4) * 0.8);
      
      // Day of week demand
      if(DAY_OF_WEEK_DEMAND[dayOfWeek]?.includes(item.category)){
          demandScore *= 1.3;
          reason = `It's a popular day for ${item.category.toLowerCase()}s.`;
      }
      // Location demand
      if(LOCATION_DEMAND[location.name]?.[item.category]){
          demandScore *= LOCATION_DEMAND[location.name][item.category]!;
          reason = `${item.category}s are always hot in ${location.name}.`;
      }
      // Special event demand
      if(activeEvent && activeEvent.categories.includes(item.category)) {
          demandScore *= activeEvent.demandMultiplier;
          reason = activeEvent.reason;
      }
      
      let demandLevel: DemandLevel;
      if (demandScore > 2.5) demandLevel = DemandLevel.VERY_HIGH;
      else if (demandScore > 1.5) demandLevel = DemandLevel.HIGH;
      else if (demandScore < 0.7) demandLevel = DemandLevel.CRASH;
      else if (demandScore < 0.9) demandLevel = DemandLevel.LOW;
      else demandLevel = DemandLevel.MEDIUM;

      const base = item.basePrice * demandScore;
      data[location.name]![item.name] = {
        low: Math.max(1, Math.round(base * 0.6)),
        mid: Math.max(1, Math.round(base * 1.0)),
        high: Math.max(1, Math.round(base * 1.5)),
        demandLevel,
        demandReason: reason
      };
    });
  });
  return data as MarketData;
};

const generateDailyChallenge = (): DailyChallenge => {
    const template = DAILY_CHALLENGE_TEMPLATES[Math.floor(Math.random() * DAILY_CHALLENGE_TEMPLATES.length)];
    const target = Math.round((Math.random() * (template.targetRange[1] - template.targetRange[0]) + template.targetRange[0]) / 100) * 100;
    
    let item: string | undefined;
    if (template.type === 'PROFIT_FROM') {
        const category = template.itemCategories[Math.floor(Math.random() * template.itemCategories.length)];
        const possibleItems = ITEMS.filter(i => i.category === category);
        item = possibleItems[Math.floor(Math.random() * possibleItems.length)].name;
    }
    
    return {
        type: template.type,
        description: template.description(target, item),
        target,
        progress: 0,
        item,
        reward: template.reward,
        isComplete: false,
    };
};

// --- RANDOM EVENTS ---
const createRandomEvents = (playerState: PlayerState): GameEvent[] => [
    {
        title: "Found Lost Wallet",
        description: "You found a wallet stuffed with cash in an alley. Your lucky day!",
        apply: (s) => {
            const amount = Math.floor(Math.random() * 501) + 200;
            return { newState: { ...s, cash: s.cash + amount }, log: `Lucky find! You pocketed ${formatCurrency(amount)}.` };
        }
    },
    {
        title: "Rival Bust",
        description: "You hear chatter that a rival crew got busted, leaving a gap in the market.",
        isMarketEvent: true,
        apply: (s) => ({ newState: s, log: "A rival's misfortune is your opportunity. Prices are up today!"})
    },
    {
    title: "Jelly's Bulk Offer",
    description: `Your connect, Jelly, has a line on 20 units of mid-quality Ketamine. He's asking ${formatCurrency(12000)}. It's a steal, but you gotta have the cash and space.`,
    actions: [
      {
        label: "Take the deal",
        apply: (s) => {
          if (s.cash < 12000) return { newState: s, log: "You wanted the deal, but your wallet was too light." };
          const currentInv = Object.values(s.inventory).reduce((sum, q) => sum + q.low + q.mid + q.high, 0);
          if (MAX_INVENTORY - currentInv < 20) return { newState: s, log: "You wanted the deal, but had no space." };
          const newInv = { ...s.inventory };
          if(!newInv.Ketamine) newInv.Ketamine = {low: 0, mid: 0, high: 0};
          newInv.Ketamine.mid += 20;
          return { newState: { ...s, cash: s.cash - 12000, inventory: newInv }, log: "Deal made! You loaded up on 20 units of Ketamine." };
        }
      },
      { label: "Too rich for my blood", apply: (s) => ({ newState: s, log: "You told Jelly you'd have to pass." }) }
    ]
  },
  {
    title: "Titans Tailgate Bust!",
    description: "Metro PD is cracking down on pre-game festivities. You have to dump your stuff to avoid getting busted.",
    apply: (s) => {
      const totalItems = Object.values(s.inventory).reduce((sum, q) => sum + q.low + q.mid + q.high, 0);
      SoundManager.play('siren');
      if (totalItems === 0) return { newState: s, log: "Cops swarmed the tailgate, but your pockets were empty." };
      return { newState: { ...s, inventory: {}, heat: Math.max(0, s.heat - 1) }, log: "You dumped your entire stash to avoid the cops. Heat decreased." };
    }
  },
];

// --- UI COMPONENTS ---
const Particle: React.FC<{ content: string; x: number; y: number; onEnd: () => void }> = ({ content, x, y, onEnd }) => {
    useEffect(() => {
        const timer = setTimeout(onEnd, 1000);
        return () => clearTimeout(timer);
    }, [onEnd]);

    return (
        <div className="absolute text-tn-orange text-2xl font-bold pointer-events-none" style={{ left: x, top: y, animation: 'float-up 1s forwards' }}>
            {content}
            <style>{`
                @keyframes float-up {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(-50px); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

const NashvilleSkylineSVG = () => (
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-auto text-black opacity-30">
        <path d="M0 120 L0 80 L50 80 L50 60 L100 60 L100 90 L150 90 L150 70 L200 70 L200 100 L250 100 L250 50 L300 50 L300 110 L320 110 L320 40 L350 40 L350 120 L400 120 L400 80 L450 80 L450 110 L500 110 L500 70 L550 70 L550 90 L600 90 L600 40 L610 40 L610 30 L620 30 L620 40 L630 40 L630 90 L700 90 L700 60 L750 60 L750 100 L800 100 L800 80 L850 80 L850 120 L900 120 L900 70 L950 70 L950 110 L1000 110 L1000 60 L1050 60 L1050 90 L1100 90 L1100 80 L1150 80 L1150 120 L1200 120 Z" fill="currentColor"/>
    </svg>
);

const IntroScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const lines = ["Nashville, Tennessee", "Music City has a darker rhythm", "You owe $2000 to dangerous people", "30 days to survive the streets", "Every deal could be your last",];
    const finalTitle = "NASHVILLE HUSTLE";
    const [activeLine, setActiveLine] = useState(-1);
    const [showSkip, setShowSkip] = useState(false);

    useEffect(() => {
        const timers = lines.map((_, index) => setTimeout(() => setActiveLine(index), (index + 1) * 2000));
        const finalTitleTimer = setTimeout(() => setActiveLine(lines.length), (lines.length + 1) * 2000);
        const skipTimer = setTimeout(() => setShowSkip(true), 3000);
        const endTimer = setTimeout(onComplete, (lines.length + 2) * 2000 + 1000);
        return () => { timers.forEach(clearTimeout); clearTimeout(finalTitleTimer); clearTimeout(skipTimer); clearTimeout(endTimer); };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-smokey-gray flex flex-col items-center justify-center text-center p-8 z-50" onClick={onComplete}>
            <div className="text-tn-orange font-sans font-bold space-y-4">
                {lines.map((line, index) => (<p key={index} className={`text-2xl md:text-4xl transition-opacity duration-1000 ${activeLine >= index ? 'opacity-100' : 'opacity-0'}`}>{line}</p>))}
                <h1 className={`text-5xl md:text-7xl font-black tracking-wider transition-all duration-1000 delay-500 ${activeLine === lines.length ? 'opacity-100 scale-110' : 'opacity-0 scale-90'}`}>{finalTitle}</h1>
            </div>
            {showSkip && (<button onClick={(e) => { e.stopPropagation(); onComplete(); }} className="absolute bottom-8 right-8 text-white text-sm opacity-70 hover:opacity-100 transition-opacity">Tap to skip</button>)}
            <NashvilleSkylineSVG />
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string; }> = ({ icon, label, value, color }) => (
    <div className="bg-element-bg p-3 rounded-lg flex items-center shadow-md"><div className={`mr-3 p-2 rounded-md ${color}`}>{icon}</div><div><div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div><div className="text-lg font-bold text-white">{value}</div></div></div>);
const ProgressBar: React.FC<{ value: number, max: number, color: string }> = ({ value, max, color }) => (<div className="w-full bg-element-bg rounded-full h-2.5"><div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }}></div></div>);

const CharacterSelectionScreen: React.FC<{ onCharacterSelect: (character: CharacterClass) => void }> = ({ onCharacterSelect }) => (
    <div className="text-center p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-6xl md:text-7xl font-black text-tn-orange font-mono mb-2 tracking-wider">NASHVILLE HUSTLE</h1>
        <h2 className="text-2xl text-gray-300 mb-8">Choose Your Background</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">{CHARACTER_CLASSES.map(character => (<button key={character.name} onClick={() => onCharacterSelect(character)} className="bg-surface-bg border border-element-bg p-6 rounded-lg text-left hover:border-tn-orange hover:scale-105 transition-all shadow-lg hover:brightness-115"><h3 className="text-2xl font-bold text-tn-orange mb-2">{character.name}</h3><p className="text-gray-400 mb-4">{character.description}</p><p className="font-bold text-success">{character.perk}</p></button>))}</div>
    </div>
);

const ItemCard: React.FC<{ itemData: { name: string; demandLevel: DemandLevel }; prices: { low: number, mid: number, high: number }; playerCash: number; playerQuantities: { low: number, mid: number, high: number }; inventorySpace: number; onBuy: (name: string, quality: 'low' | 'mid' | 'high', quantity: number, event: React.MouseEvent) => void; onSell: (name: string, quality: 'low' | 'mid' | 'high', quantity: number, event: React.MouseEvent) => void; }> = ({ itemData, prices, playerCash, playerQuantities, inventorySpace, onBuy, onSell }) => {
    const [quantity, setQuantity] = useState(1);
    const { name, demandLevel } = itemData;

    const demandStyles = {
        [DemandLevel.CRASH]: { glow: 'border-red-500/50', text: 'text-red-500', icon: '📉', label: 'CRASH' },
        [DemandLevel.LOW]: { glow: 'border-transparent', text: 'text-gray-400', icon: '', label: '' },
        [DemandLevel.MEDIUM]: { glow: 'border-transparent', text: 'text-white', icon: '', label: '' },
        [DemandLevel.HIGH]: { glow: 'border-tn-orange/50', text: 'text-tn-orange', icon: '🔥', label: 'HOT' },
        [DemandLevel.VERY_HIGH]: { glow: 'border-tn-orange animate-pulse', text: 'text-tn-orange font-bold', icon: '🔥🔥', label: 'SURGE' },
    };
    const currentDemandStyle = demandStyles[demandLevel];
    
    const renderQualityRow = (quality: 'low' | 'mid' | 'high', label: string) => {
        const price = prices[quality];
        const canAfford = playerCash >= price * quantity;
        const hasStock = playerQuantities[quality] >= quantity;
        const hasSpace = inventorySpace >= quantity;
        return (<div className="grid grid-cols-4 items-center gap-2 text-sm"><div className="font-bold text-gray-300">{label}</div><div className="text-white">{formatCurrency(price)}</div><button onClick={(e) => { onBuy(name, quality, quantity, e); setQuantity(1); }} disabled={!canAfford || !hasSpace || quantity <= 0} className="bg-success/80 text-xs font-bold py-1.5 px-2 rounded-md hover:bg-success disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors hover:brightness-115">BUY</button><button onClick={(e) => { onSell(name, quality, quantity, e); setQuantity(1); }} disabled={!hasStock || quantity <= 0} className="bg-danger/80 text-xs font-bold py-1.5 px-2 rounded-md hover:bg-danger disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors hover:brightness-115">SELL</button></div>);
    };

    return (
        <div className={`bg-element-bg p-4 rounded-lg shadow-md border-2 ${currentDemandStyle.glow} transition-all`}>
            <div className="flex justify-between items-center mb-2">
                 <h3 className={`text-xl font-bold ${currentDemandStyle.text}`}>{name}</h3>
                 {currentDemandStyle.icon && <span className="text-lg" title={currentDemandStyle.label}>{currentDemandStyle.icon}</span>}
            </div>
            <div className="text-xs text-gray-400 mb-3">Hold: <span className="font-bold text-white">L:</span>{playerQuantities.low} <span className="font-bold text-white">M:</span>{playerQuantities.mid} <span className="font-bold text-white">H:</span>{playerQuantities.high}</div>
            <div className="flex items-center gap-2 mb-4"><button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="bg-smokey-gray p-2 rounded-md hover:bg-tn-orange hover:brightness-115"><MinusIcon className="h-4 w-4" /></button><input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} className="bg-surface-bg border border-smokey-gray rounded-md w-full text-center py-2 font-bold text-lg" /><button onClick={() => setQuantity(q => q + 1)} className="bg-smokey-gray p-2 rounded-md hover:bg-tn-orange hover:brightness-115"><PlusIcon className="h-4 w-4" /></button></div>
            <div className="space-y-2">{renderQualityRow('low', 'Low')}{renderQualityRow('mid', 'Mid')}{renderQualityRow('high', 'High')}</div>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; }> = ({ active, onClick, children }) => (<button onClick={onClick} className={`py-2 px-6 font-bold text-lg rounded-t-lg transition-colors ${active ? 'bg-surface-bg text-tn-orange' : 'bg-element-bg text-gray-400 hover:bg-surface-bg'}`}>{children}</button>);

// --- MAIN APP COMPONENT ---
export default function App() {
    const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.Intro);
    const [playerState, setPlayerState] = useState<PlayerState | null>(null);
    const [marketData, setMarketData] = useState<MarketData | null>(null);
    const [eventLog, setEventLog] = useState<string[]>([]);
    const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
    const [showLoanOffer, setShowLoanOffer] = useState(false);
    const [activeTab, setActiveTab] = useState<'market' | 'travel' | 'status'>('market');
    const [particles, setParticles] = useState<{id: number, content: string, x: number, y: number}[]>([]);
    const [isShaking, setIsShaking] = useState(false);

    const inventorySize = useMemo(() => playerState ? Object.values(playerState.inventory).reduce((sum, q) => sum + q.low + q.mid + q.high, 0) : 0, [playerState]);
    const inventorySpace = MAX_INVENTORY - inventorySize;

    const triggerParticles = (content: string, x: number, y: number, count: number) => {
        const newParticles = Array.from({ length: count }).map(() => ({
            id: Math.random(),
            content,
            x: x + (Math.random() - 0.5) * 50,
            y: y + (Math.random() - 0.5) * 50,
        }));
        setParticles(prev => [...prev, ...newParticles]);
    };
    
    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const startGame = useCallback((character: CharacterClass) => {
        const initialReputation = FACTION_NAMES.reduce((acc, name) => ({ ...acc, [name]: 0 }), {} as Record<FactionName, number>);
        Object.assign(initialReputation, character.initialRep);

        setPlayerState({ 
            cash: INITIAL_CASH, debt: INITIAL_DEBT, inventory: {}, location: 'Downtown', day: 1, interestRate: INTEREST_RATE, hasTakenSecondLoan: false, character, heat: 0, reputation: initialReputation,
            activeChallenge: generateDailyChallenge(), stats: { totalDeals: 0, biggestProfit: 0, daysSurvived: 0, heatRecord: 0 }, searchesToday: 3,
        });
        setMarketData(generateMarketData(1));
        setEventLog(['Started your hustle. Pay back the shark in 30 days.']);
        setGameStatus(GameStatus.Playing);
    }, []);

    const logEvent = useCallback((message: string) => setEventLog(prev => [message, ...prev].slice(0, 10)), []);

    const checkChallengeCompletion = useCallback((state: PlayerState, type: 'sell'|'profit'|'debt', amount: number, item?: string) => {
        if (!state.activeChallenge || state.activeChallenge.isComplete) return state;
        
        let challenge = { ...state.activeChallenge };
        let madeProgress = false;

        if (challenge.type === 'SELL_VALUE' && type === 'sell') {
            challenge.progress += amount;
            madeProgress = true;
        } else if (challenge.type === 'PROFIT_FROM' && type === 'profit' && challenge.item === item) {
             challenge.progress += amount;
             madeProgress = true;
        } else if (challenge.type === 'PAY_DEBT' && type === 'debt') {
             challenge.progress += amount;
             madeProgress = true;
        }

        if (madeProgress && challenge.progress >= challenge.target) {
            challenge.isComplete = true;
            let newState = { ...state };
            if (challenge.reward.type === 'cash') {
                newState.cash += challenge.reward.amount;
                logEvent(`Challenge complete! Reward: ${formatCurrency(challenge.reward.amount)}`);
            } else {
                const newRep = { ...newState.reputation };
                FACTION_NAMES.forEach(f => newRep[f] = Math.min(100, newRep[f] + challenge.reward.amount));
                newState.reputation = newRep;
                logEvent(`Challenge complete! +${challenge.reward.amount} rep with all factions.`);
            }
            SoundManager.play('success');
            return {...newState, activeChallenge: challenge };
        }
        
        return {...state, activeChallenge: challenge };
    }, [logEvent]);

    const handleTravel = useCallback((newLocation: LocationName) => {
        if (!playerState) return;
        if (playerState.day >= GAME_DURATION_DAYS) { setGameStatus(GameStatus.GameOver); return; }

        const newDay = playerState.day + 1;
        const newDebt = Math.round(playerState.debt * (1 + playerState.interestRate));
        logEvent(`Day ${newDay}: Traveled to ${newLocation}. Interest added to debt.`);

        let nextMarketData = generateMarketData(newDay);
        let nextPlayerState = { ...playerState, day: newDay, location: newLocation, debt: newDebt, heat: Math.max(0, playerState.heat - 1), searchesToday: 3, activeChallenge: generateDailyChallenge() };
        nextPlayerState.stats.daysSurvived = newDay - 1;

        const RANDOM_EVENTS = createRandomEvents(nextPlayerState);
        if (Math.random() < 0.33) {
            const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
            setCurrentEvent(event);
            if(event.isMarketEvent) { nextMarketData = generateMarketData(newDay); } // Reroll market on event
            if (event.apply && !event.actions) {
                const { newState, log } = event.apply(nextPlayerState);
                nextPlayerState = newState;
                logEvent(log);
                if(event.title.includes("Bust")) triggerShake();
            }
        }
        
        setPlayerState(nextPlayerState);
        setMarketData(nextMarketData);
        setActiveTab('market');
    }, [playerState, logEvent]);

    const handleTransaction = (itemName: string, quality: 'low' | 'mid' | 'high', quantity: number, isBuying: boolean, event: React.MouseEvent) => {
        if (!playerState || !marketData) return;

        const price = marketData[playerState.location][itemName][quality];
        const cost = price * quantity;
        const currentItemInv = playerState.inventory[itemName] || { low: 0, mid: 0, high: 0 };
        
        let newState = { ...playerState };

        if (isBuying) {
            if (playerState.cash < cost || inventorySpace < quantity) return;
            const newInventory = { ...playerState.inventory, [itemName]: { ...currentItemInv, [quality]: currentItemInv[quality] + quantity }};
            
            let newHeat = playerState.heat;
            if (cost > 10000) newHeat = Math.min(5, newHeat + 2);
            else if (cost > 5000) newHeat = Math.min(5, newHeat + 1);

            const locationFactions = FACTIONS.filter(f => f.locations.includes(playerState.location));
            const newReputation = { ...playerState.reputation };
            locationFactions.forEach(f => newReputation[f.name] = Math.min(100, newReputation[f.name] + 1));
            
            newState.cash -= cost;
            newState.inventory = newInventory;
            newState.heat = newHeat;
            newState.reputation = newReputation;
            newState.stats.heatRecord = Math.max(newState.stats.heatRecord, newHeat);
            logEvent(`Bought ${quantity} ${quality} ${itemName} for ${formatCurrency(cost)}.`);
            
        } else { // Selling
            if (currentItemInv[quality] < quantity) return;
            const newInventory = { ...playerState.inventory, [itemName]: { ...currentItemInv, [quality]: currentItemInv[quality] - quantity }};
            const profit = cost - (ITEMS.find(i=>i.name === itemName)!.basePrice * quantity);

            newState.cash += cost;
            newState.inventory = newInventory;
            newState.stats.biggestProfit = Math.max(newState.stats.biggestProfit, profit);
            newState.stats.totalDeals += 1;
            newState = checkChallengeCompletion(newState, 'sell', cost, itemName);
            newState = checkChallengeCompletion(newState, 'profit', profit, itemName);
            logEvent(`Sold ${quantity} ${quality} ${itemName} for ${formatCurrency(cost)}.`);
            if(profit > 1000) {
                SoundManager.play('cash');
                triggerParticles('$', event.clientX, event.clientY, Math.min(5, Math.floor(profit/1000)));
            }
        }
        setPlayerState(newState);
    };

    const handlePayDebt = useCallback(() => {
        if (!playerState) return;
        const payment = Math.min(playerState.cash, playerState.debt);
        if (payment > 0) {
            let newState = { ...playerState, cash: playerState.cash - payment, debt: playerState.debt - payment };
            newState = checkChallengeCompletion(newState, 'debt', payment);
            setPlayerState(newState);
            logEvent(`Paid ${formatCurrency(payment)} to the loan shark.`);
            if (newState.debt <= 0 && !playerState.hasTakenSecondLoan) {
                setShowLoanOffer(true);
                logEvent(`You've paid off your debt! The loan shark is impressed...`);
            } else if (newState.debt <=0) {
                logEvent(`You've paid off your debt!`);
            }
        }
    }, [playerState, checkChallengeCompletion, logEvent]);

    const handleSearchStash = useCallback(() => {
        if(!playerState || playerState.searchesToday <= 0) return;
        SoundManager.play('click');
        let newState = {...playerState, searchesToday: playerState.searchesToday - 1};
        const roll = Math.random();
        if(roll < 0.2) { // Find cash
            const amount = Math.floor(Math.random() * 401) + 100;
            newState.cash += amount;
            logEvent(`Your search paid off! You found ${formatCurrency(amount)}.`);
        } else if (roll < 0.3) { // Find drugs
            const item = ITEMS[Math.floor(Math.random()*ITEMS.length)];
            const quality: ('low'|'mid'|'high') = ['low','mid','high'][Math.floor(Math.random()*3)] as any;
            const quantity = Math.floor(Math.random() * 2) + 1;
            const currentInv = newState.inventory[item.name] || { low: 0, mid: 0, high: 0 };
            newState.inventory = { ...newState.inventory, [item.name]: { ...currentInv, [quality]: currentInv[quality] + quantity }};
            logEvent(`Jackpot! You found ${quantity} unit(s) of ${quality} ${item.name}.`);
        } else if (roll < 0.4) { // Attract heat
            newState.heat = Math.min(5, newState.heat + 1);
            newState.stats.heatRecord = Math.max(newState.stats.heatRecord, newState.heat);
            logEvent(`Your searching looked suspicious. Heat increased.`);
        } else {
            logEvent(`You searched the area but found nothing.`);
        }
        setPlayerState(newState);
    }, [playerState, logEvent]);


    const renderContent = () => {
        if (!playerState || !marketData) { // Covers Intro, Character Selection, initial loading
             switch (gameStatus) {
                case GameStatus.Intro: return <IntroScreen onComplete={() => setGameStatus(GameStatus.CharacterSelection)} />;
                case GameStatus.CharacterSelection: return <CharacterSelectionScreen onCharacterSelect={startGame} />;
                case GameStatus.GameOver: return playerState ? <div /> : <CharacterSelectionScreen onCharacterSelect={startGame} />;
                default: return null;
            }
        }

        const currentLocationInfo = LOCATIONS.find(l => l.name === playerState.location)!;
        const top3MarketItems = Object.entries(marketData[playerState.location]).sort(([, a], [, b]) => b.demandLevel - a.demandLevel).slice(0, 3);
        
        return (
            <div className={`w-full max-w-7xl mx-auto p-4 space-y-4 transition-transform duration-500 ${isShaking ? 'animate-shake' : ''}`}>
                {/* Header */}
                <header className="bg-surface-bg p-4 rounded-lg shadow-lg grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard icon={<CalendarDaysIcon className="h-6 w-6" />} label="Day" value={`${playerState.day} / ${GAME_DURATION_DAYS}`} color="text-blue-400" />
                    <StatCard icon={<MapPinIcon className="h-6 w-6" />} label="Location" value={playerState.location} color="text-purple-400" />
                    <StatCard icon={<BanknotesIcon className="h-6 w-6" />} label="Cash" value={formatCurrency(playerState.cash)} color="text-success" />
                     <div className="bg-element-bg p-3 rounded-lg flex items-center shadow-md"><div className="mr-3 p-2 rounded-md text-red-400"><FireIcon className="h-6 w-6" /></div><div><div className="text-xs text-gray-400 uppercase tracking-wider">Heat</div><div className="flex items-center">{Array.from({length: 5}).map((_, i) => <StarIcon key={i} className={`h-5 w-5 ${i < playerState.heat ? 'text-red-500' : 'text-gray-600'}`} />)}</div></div></div>
                    <div className="bg-element-bg p-3 rounded-lg shadow-md lg:col-span-2">
                        <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider mb-1"><span>Debt: <span className="font-bold text-danger">{formatCurrency(playerState.debt)}</span></span><span>Hold: <span className="font-bold text-warning">{`${inventorySize}/${MAX_INVENTORY}`}</span></span></div>
                        <div className="space-y-2"><ProgressBar value={INITIAL_DEBT - playerState.debt} max={INITIAL_DEBT} color="bg-danger" /><ProgressBar value={inventorySize} max={MAX_INVENTORY} color="bg-warning" /></div>
                    </div>
                </header>
                 {/* Tab Navigation */}
                <div className="flex space-x-1 border-b-2 border-element-bg"><TabButton active={activeTab === 'market'} onClick={() => setActiveTab('market')}>Market</TabButton><TabButton active={activeTab === 'travel'} onClick={() => setActiveTab('travel')}>Travel</TabButton><TabButton active={activeTab === 'status'} onClick={() => setActiveTab('status')}>Status</TabButton></div>
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-surface-bg p-4 rounded-lg shadow-lg">
                        {activeTab === 'market' && (<><h2 className="text-3xl font-bold text-white mb-1">{currentLocationInfo.name} Market</h2><p className="text-sm text-gray-400 mb-4">{currentLocationInfo.description}</p><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">{ITEMS.map(item => (<ItemCard key={item.name} itemData={{name: item.name, demandLevel: marketData[playerState.location][item.name].demandLevel}} prices={marketData[playerState.location][item.name]} playerCash={playerState.cash} playerQuantities={playerState.inventory[item.name] || { low: 0, mid: 0, high: 0 }} inventorySpace={inventorySpace} onBuy={(name, quality, quantity, e) => handleTransaction(name, quality, quantity, true, e)} onSell={(name, quality, quantity, e) => handleTransaction(name, quality, quantity, false, e)} />))}</div></>)}
                        {activeTab === 'travel' && (<div className="space-y-4"><h2 className="text-3xl font-bold text-white mb-3">Travel</h2><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{LOCATIONS.filter(loc => loc.name !== playerState.location).map(loc => { const topDemand = Object.entries(marketData[loc.name]).sort(([,a],[,b]) => b.demandLevel - a.demandLevel).slice(0,2); return (<button key={loc.name} onClick={() => handleTravel(loc.name)} className="text-left p-4 bg-element-bg rounded-lg hover:bg-tn-orange group transition-all shadow-md hover:brightness-115"><div className="font-bold text-lg text-white group-hover:text-black">{loc.name}</div><div className="text-sm text-gray-400 group-hover:text-black mb-2">{loc.description}</div><div className="text-xs space-y-1">{topDemand.map(([name, data])=> (<div key={name} className="flex items-center gap-1 text-tn-orange group-hover:text-black"><FireIcon className="h-4 w-4"/><span>{name}</span></div>))}</div></button>);})}</div></div>)}
                        {activeTab === 'status' && (<div><h2 className="text-3xl font-bold text-white mb-4">Your Status</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-element-bg p-4 rounded-lg"><h3 className="text-xl font-bold text-tn-orange mb-2">{playerState.character?.name}</h3><p className="text-gray-400 mb-2">{HEAT_LEVELS[playerState.heat].description}</p><p className="text-sm text-success font-bold">{playerState.character?.perk}</p></div><div className="bg-element-bg p-4 rounded-lg"><h3 className="text-xl font-bold text-tn-orange mb-3">Faction Reputation</h3><div className="space-y-3">{FACTION_NAMES.map(name => (<div key={name}><div className="text-sm text-gray-300 mb-1">{name}</div><ProgressBar value={playerState.reputation[name]} max={100} color="bg-tn-orange" /></div>))}</div></div></div></div>)}
                    </div>
                    <aside className="space-y-4">
                        <div className="bg-surface-bg p-4 rounded-lg shadow-lg"><h2 className="text-xl font-bold text-white mb-3">Actions</h2><div className="flex flex-col gap-2"><button onClick={handlePayDebt} disabled={playerState.cash <= 0 || playerState.debt <= 0} className="w-full py-3 bg-danger font-bold rounded-md hover:bg-opacity-80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed hover:brightness-115">Pay Loan Shark</button><button onClick={handleSearchStash} disabled={playerState.searchesToday <= 0} className="flex items-center justify-center gap-2 w-full py-3 bg-smokey-gray font-bold rounded-md hover:bg-opacity-80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed hover:brightness-115"><MagnifyingGlassIcon className="h-5 w-5"/> Search Area ({playerState.searchesToday})</button>{playerState.debt <= 0 && <button onClick={() => setGameStatus(GameStatus.GameOver)} className="w-full py-3 bg-success font-bold rounded-md hover:bg-opacity-80 transition-colors hover:brightness-115">Retire Victorious</button>}</div></div>
                        {playerState.activeChallenge && !playerState.activeChallenge.isComplete && <div className="bg-surface-bg p-4 rounded-lg shadow-lg"><div className="flex justify-between items-center mb-2"><h2 className="text-xl font-bold text-white">Daily Challenge</h2><TrophyIcon className="h-6 w-6 text-tn-orange"/></div><p className="text-sm text-gray-300 mb-2">{playerState.activeChallenge.description}</p><ProgressBar value={playerState.activeChallenge.progress} max={playerState.activeChallenge.target} color="bg-tn-orange"/></div>}
                        <div className="bg-surface-bg p-4 rounded-lg shadow-lg"><div className="flex justify-between items-center mb-2"><h2 className="text-xl font-bold text-white">Quick Stats</h2><ChartBarIcon className="h-6 w-6 text-blue-400"/></div><div className="text-sm space-y-1 text-gray-300"><div>Total Deals: <span className="font-bold text-white">{playerState.stats.totalDeals}</span></div><div>Biggest Profit: <span className="font-bold text-success">{formatCurrency(playerState.stats.biggestProfit)}</span></div><div>Heat Record: <span className="font-bold text-danger">{playerState.stats.heatRecord} stars</span></div></div></div>
                        <div className="bg-surface-bg p-4 rounded-lg shadow-lg"><h2 className="text-xl font-bold text-white mb-3">Market Intel</h2><div className="space-y-2 text-sm text-gray-300">{top3MarketItems.map(([name, data]) => (<div key={name}><div className="font-bold text-tn-orange">{name}</div><p className="text-xs text-gray-400">{data.demandReason}</p></div>))}</div></div>
                        <div className="bg-surface-bg p-4 rounded-lg shadow-lg"><h2 className="text-xl font-bold text-white mb-3">Log</h2><div className="space-y-2 text-sm text-gray-400 font-mono">{eventLog.map((msg, i) => <p key={i} className={`transition-colors ${i === 0 ? 'text-white' : ''}`}>{`> ${msg}`}</p>)}</div></div>
                    </aside>
                </main>
            </div>
        );
    };

    return (
        <div className="bg-base-bg text-gray-200 min-h-screen font-sans flex items-center justify-center relative overflow-hidden">
            {renderContent()}
            <div className="absolute inset-0 pointer-events-none z-50">
                {particles.map(p => <Particle key={p.id} {...p} onEnd={() => setParticles(all => all.filter(particle => particle.id !== p.id))} />)}
            </div>
        </div>
    );
}
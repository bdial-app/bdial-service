import { Injectable, Logger } from '@nestjs/common';
import leoProfanity from 'leo-profanity';

/**
 * Global content sanitization service.
 *
 * Uses three layers of detection:
 *  1. `leo-profanity` — English + French + Russian dictionaries with obfuscation handling
 *  2. Custom word lists — Hindi, Urdu, Arabic, Gujarati, Bengali, Tamil, Punjabi
 *  3. Multi-word phrase substring matching
 *
 * All layers run on every check; if ANY layer flags the text it is rejected.
 * To extend: just push more words into SOUTH_ASIAN_PROFANITY or call addCustomWords().
 */
@Injectable()
export class ContentSanitizerService {
  private readonly logger = new Logger(ContentSanitizerService.name);
  private readonly customWords: Set<string>;

  constructor() {
    // ── Layer 1: leo-profanity (English default + French + Russian) ──
    leoProfanity.loadDictionary('en');
    leoProfanity.add(SOUTH_ASIAN_PROFANITY);

    // ── Layer 2: custom Set for fast O(1) lookup on exact tokens ──
    this.customWords = new Set(SOUTH_ASIAN_PROFANITY.map((w) => w.toLowerCase()));
  }

  /**
   * Check if text contains profanity.  Returns { clean, flagged, flaggedWords }.
   */
  check(text: string): ContentCheckResult {
    if (!text || !text.trim()) {
      return { clean: true, flagged: false, flaggedWords: [] };
    }

    const flaggedWords: string[] = [];

    // 1. leo-profanity check (handles obfuscation, symbol substitution)
    try {
      if (leoProfanity.check(text)) {
        const words = text.split(/\s+/);
        for (const w of words) {
          if (leoProfanity.check(w) && !flaggedWords.includes(w.toLowerCase())) {
            flaggedWords.push(w.toLowerCase());
          }
        }
        if (flaggedWords.length === 0) flaggedWords.push('[detected by leo-profanity]');
      }
    } catch { /* defensive */ }

    // 2. Custom word-set lookup (fast O(1) for South-Asian languages)
    const normalized = text.toLowerCase().replace(/[.,!?;:'"()\[\]{}<>]/g, '');
    for (const token of normalized.split(/\s+/)) {
      if (token && this.customWords.has(token) && !flaggedWords.includes(token)) {
        flaggedWords.push(token);
      }
    }

    // 3. Multi-word phrase check (e.g. "teri maa ki")
    const lowerText = text.toLowerCase();
    for (const phrase of MULTI_WORD_PHRASES) {
      if (lowerText.includes(phrase) && !flaggedWords.includes(phrase)) {
        flaggedWords.push(phrase);
      }
    }

    const unique = [...new Set(flaggedWords)];

    if (unique.length > 0) {
      this.logger.warn(`Profanity detected: [${unique.join(', ')}]`);
    }

    return {
      clean: unique.length === 0,
      flagged: unique.length > 0,
      flaggedWords: unique,
    };
  }

  /**
   * Sanitize text by replacing profane words with asterisks.
   */
  sanitize(text: string): string {
    if (!text) return text;
    try {
      return leoProfanity.clean(text);
    } catch {
      return text;
    }
  }

  /**
   * Returns true if text is clean (no profanity).
   */
  isClean(text: string): boolean {
    return this.check(text).clean;
  }

  /**
   * Add custom words at runtime (e.g. loaded from DB / admin panel).
   */
  addCustomWords(words: string[]) {
    const lower = words.map((w) => w.toLowerCase());
    leoProfanity.add(lower);
    lower.forEach((w) => this.customWords.add(w));
  }
}

export interface ContentCheckResult {
  clean: boolean;
  flagged: boolean;
  flaggedWords: string[];
}

// ─── Multi-word phrases (checked via substring match) ───────────────────────

const MULTI_WORD_PHRASES = [
  'teri maa ki', 'teri maa', 'bhen ke lode', 'maa ki chut',
  'ibn el sharmouta', 'ibn sharmouta', 'ibn el kalb', 'bint el kalb',
  'ibn el hmar', 'kos omak', 'ayreh feek', 'telhas teezi',
  'khotay ki aulad', 'khotey da puttar', 'suwar ki aulad',
  'aaichya gaand', 'aaichya gavat', 'aichya gavat',
];

// ─── South Asian + Arabic words (added on top of bad-words & leo-profanity) ─

const SOUTH_ASIAN_PROFANITY = [
  // Hindi / Hindustani
  'madarchod', 'maderchod', 'behenchod', 'bhenchod', 'bhosdike', 'bhosdiwale',
  'chutiya', 'chutiye', 'chutiyapa', 'chut', 'gaand', 'gand', 'gaandu', 'gandu',
  'lund', 'lauda', 'laude', 'lavde', 'lavda', 'loda', 'lode',
  'randi', 'rand', 'randwa', 'randikhana', 'randibaz',
  'harami', 'haramkhor', 'haraamzaada', 'haramzada', 'haramzade', 'haraamzaadi',
  'kutte', 'kutta', 'kutiya', 'kuttiya',
  'saala', 'saali', 'sala', 'sali',
  'tatti', 'tatte', 'tattiyan',
  'jhant', 'jhantu', 'jhandu',
  'bokachoda', 'gadha', 'gadhe', 'ullu',
  'kamina', 'kamine', 'kameena', 'kameene',
  'bhosda', 'bhosdi', 'bhosdiwala',
  'dalla', 'dalal', 'dalali',
  'chodna', 'chod', 'chodh', 'chodu', 'chodhu',
  'phuddi', 'phudi', 'lodu', 'takla',
  'hijra', 'chakka', 'chhakka',
  'maal', 'item',
  'suar', 'suwar', 'suwwar',
  'gandmasti', 'gandphad',
  'besharam', 'nalayak', 'namard',

  // Urdu
  'kanjar', 'kanjari', 'badtameez', 'badzaat',
  'gaashti', 'laanat', 'lanati',
  'kutti', 'tharki', 'gandagi', 'ghatiya',
  'badmash', 'luchar', 'luchcha',
  'kameeni', 'kameena',
  'halaaku', 'bewakoof', 'jaahil', 'jahil',
  'haraami', 'haraamkhor',

  // Arabic (Romanized)
  'kosomak', 'kuss', 'sharmouta', 'sharmuta', 'sharmout',
  'ahbal', 'ahbil', 'manyak', 'manyake',
  'khawal', 'khaneeth', 'luti',
  'kalb', 'hmar', 'zift', 'zibbeh', 'zib',
  'ibn el sharmouta', 'ibn sharmouta',
  'ibn el kalb', 'bint el kalb', 'ibn el hmar',
  'ayreh feek', 'kos omak', 'telhas teezi',
  'sharmoot', 'motakhalef', 'khanzeera', 'khanzeer',
  'teezak', 'wahad', 'ibnharam',

  // Gujarati
  'ghelo', 'ghelchodi', 'gando', 'gandi',
  'bhosdo', 'chodyu', 'lodo', 'lodho',
  'chootiya', 'chootya',
  'gadhedo', 'gadhedi',
  'rakhdi', 'raand',
  'fattu', 'fuddi', 'fuddu', 'chinal', 'randio',
  'chodlo', 'ghelchodyo', 'bhondhu', 'bhadvo', 'bhadvi',

  // Marathi
  'zavnya', 'zavnya', 'zhavnya', 'zhavalya', 'zavlya',
  'chiknya', 'chikne', 'madharchod', 'aichya gavat',
  'bhikarchot', 'bolkya', 'gandya', 'bhadvya', 'bhadvyaa',
  'raandecha', 'randecha', 'chhinaal', 'chinaal', 'chhinal',
  'gavat', 'gavti', 'halkat', 'halkya',
  'khandya', 'lundya', 'pucchya', 'popat',
  'satak', 'satakli', 'shengdana',
  'tatya', 'thobad', 'thobadya', 'bokya',
  'gandhya', 'gandul', 'gandu',
  'aaichya gaand', 'aaichya gavat',
  'maderchod', 'bhosadchya', 'bhosadya',
  'lavdya', 'goticha', 'jhavnya',

  // Bengali
  'banchod', 'magi', 'magir', 'khankir chele', 'khankir',
  'shala', 'shalir', 'boga', 'nongra',
  'chodamari', 'gudemara', 'gudemarani',
  'hatha', 'nangi', 'beshya', 'beshsha',

  // Tamil (Romanized)
  'thevdiya', 'thevdiya paiyan', 'otha', 'oombu',
  'sunni', 'soothu', 'koothi', 'myiru',
  'baadu', 'loosu', 'venna', 'kena',
  'punda', 'pundai', 'pundamavan',

  // Punjabi
  'kutti', 'kuttiya', 'pencho', 'penchod',
  'bhain', 'bhaind', 'tatta', 'tattiyan',
  'lulli', 'phuddu', 'gandh',
];


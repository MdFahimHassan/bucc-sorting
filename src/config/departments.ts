import {
  cupSvg,
  diademSvg,
  diarySvg,
  locketSvg,
  naginiSvg,
  ringSvg,
  scarSvg,
} from '../assets/svg/horcruxes';

/**
 * THE ONE PLACE TO EDIT DEPARTMENT MAPPING.
 *
 * - `id` is what the `dept` column in data/participants.csv must contain.
 * - `groupChatUrl`: replace each [PLACEHOLDER] with the real invite link
 *   before the event. While it still contains "PLACEHOLDER", the card hides the button.
 */
export interface Department {
  id: string;
  name: string;
  horcrux: string;
  /** Glow colour used in the reveal, card and share image. */
  accent: string;
  /** One line, in the Sorting Hat's voice. */
  flavor: string;
  /** Two lines on what the department does. */
  description: [string, string];
  groupChatUrl: string;
  svg: string;
}

export const DEPARTMENTS: readonly Department[] = [
  {
    id: 'comms',
    name: 'Communication and Marketing',
    horcrux: "Nagini",
    accent: '#4fbf72',
    flavor: 'A voice that slips through every corridor. Speak, and the whole castle listens.',
    description: [
      'You carry BUCC’s story to the world: campaigns, outreach and partnerships.',
      'Where the club has something to say, you decide how far it travels.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
    svg: naginiSvg,
  },
  {
    id: 'creative',
    name: 'Creative',
    horcrux: 'The Lightning Scar',
    accent: '#ef4b43',
    flavor: 'Marked by accident, bright by nature. Courage and a restless imagination.',
    description: [
      'You give BUCC its look: posters, video, motion and brand identity.',
      'Every event starts as a blank page and leaves as something people remember.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
    svg: scarSvg,
  },
  {
    id: 'events',
    name: 'Event Management',
    horcrux: "Hufflepuff’s Cup",
    accent: '#f5c242',
    flavor: 'Loyal, warm and tireless. You make a hall feel like home.',
    description: [
      'You plan and run BUCC’s workshops, contests and orientations.',
      'Logistics, hosting and the thousand small details that make a day go right.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
    svg: cupSvg,
  },
  {
    id: 'finance',
    name: 'Finance',
    horcrux: "Marvolo Gaunt’s Ring",
    accent: '#b58cff',
    flavor: 'Careful with treasure, sharp with numbers. Nothing in the vault goes unnoticed.',
    description: [
      'You manage BUCC’s budgets, sponsorships and spending.',
      'Every event that happens is one you made affordable.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
    svg: ringSvg,
  },
  {
    id: 'hr',
    name: 'Human Resources',
    horcrux: "Slytherin’s Locket",
    accent: '#f08aa8',
    flavor: 'The heart of the house. You notice who is struggling before they say a word.',
    description: [
      'You recruit, onboard and look after BUCC’s members.',
      'A club is only as strong as its people, and you keep them together.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
    svg: locketSvg,
  },
  {
    id: 'press',
    name: 'Press Release and Publication',
    horcrux: "Tom Riddle’s Diary",
    accent: '#d98a4e',
    flavor: 'Ink remembers everything. Your words will outlast the evening.',
    description: [
      'You write BUCC’s announcements, articles, newsletters and reports.',
      'What the club does becomes the record people read and share.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
    svg: diarySvg,
  },
  {
    id: 'rnd',
    name: 'Research and Development',
    horcrux: "Ravenclaw’s Diadem",
    accent: '#4fa8ff',
    flavor: 'Wit beyond measure. You ask the question nobody else thought to ask.',
    description: [
      'You explore new tech, run projects and build tools for the club.',
      'Prototypes, experiments and learning in public, one idea at a time.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
    svg: diademSvg,
  },
] as const;

export const DEPARTMENT_IDS: readonly string[] = DEPARTMENTS.map((d) => d.id);

export function getDepartment(id: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.id === id);
}

export function hasGroupChat(d: Department): boolean {
  return /^https?:\/\//i.test(d.groupChatUrl) && !d.groupChatUrl.includes('PLACEHOLDER');
}

/**
 * Student ID format: 8 digits, e.g. 26301234.
 * Change this regex (and the hint copy in the ID screen) if your IDs differ.
 * Used by the client for friendly validation; build-data.ts only requires non-empty.
 */
export const STUDENT_ID_PATTERN = /^\d{8}$/;
export const STUDENT_ID_EXAMPLE = '26301234';

export const EVENT = {
  club: 'BUCC',
  clubFull: 'BRAC University Computer Club',
  label: 'BUCC Fall 26',
  title: 'The Sorting Ceremony',
} as const;

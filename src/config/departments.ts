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
  /** The animal, e.g. "Stag". */
  patronus: string;
  /** Whose patronus it is, e.g. "Harry’s". Reads as "Harry’s Stag". */
  bearer: string;
  /** Glow colour used in the reveal, card and share image. */
  accent: string;
  /** One line, in the Sorting Hat's voice. */
  flavor: string;
  /** Short line the Hat says mid-sort, between "Plenty of courage" and "I know just the place". */
  sortingLine: string;
  /** Two lines on what the department does. */
  description: [string, string];
  groupChatUrl: string;
}

export const DEPARTMENTS: readonly Department[] = [
  {
    id: 'comms',
    name: 'Communication and Marketing',
    patronus: 'Phoenix',
    bearer: 'Dumbledore’s',
    accent: '#f7707a',
    flavor: 'Rising, renewing, and always carrying the message. Wherever the club needs a voice, you arrive on wings.',
    sortingLine: 'A silver tongue for alliances...',
    description: [
      'You carry BUCC’s story to the world: campaigns, outreach and partnerships.',
      'Where the club has something to say, you decide how far it travels.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
  },
  {
    id: 'creative',
    name: 'Creative',
    patronus: 'Tabby Cat',
    bearer: 'McGonagall’s',
    accent: '#6f8cf7',
    flavor: 'Poised, sharp-eyed and braver than you let on. Your ideas arrive exactly when needed, and always land on their feet.',
    sortingLine: 'Visions shaped from pure magic...',
    description: [
      'You give BUCC its look: posters, video, motion and brand identity.',
      'Every event starts as a blank page and leaves as something people remember.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
  },
  {
    id: 'events',
    name: 'Event Management',
    patronus: 'Hare',
    bearer: 'Luna’s',
    accent: '#74dc7e',
    flavor: 'Light on your feet and tuned to what others miss. You turn an ordinary evening into something people believe in.',
    sortingLine: 'Brave architects of beautiful chaos...',
    description: [
      'You plan and run BUCC’s workshops, contests and orientations.',
      'Logistics, hosting and the thousand small details that make a day go right.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
  },
  {
    id: 'finance',
    name: 'Finance',
    patronus: 'Horse',
    bearer: 'Ginny’s',
    accent: '#a96ff7',
    flavor: 'Steady stride, sure footing. You carry the club’s weight without ever breaking pace.',
    sortingLine: 'Calculating minds guarding the gold...',
    description: [
      'You manage BUCC’s budgets, sponsorships and spending.',
      'Every event that happens is one you made affordable.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
  },
  {
    id: 'hr',
    name: 'Human Resources',
    patronus: 'Otter',
    bearer: 'Hermione’s',
    accent: '#f2e063',
    flavor: 'Clever, warm and fiercely loyal. You make sure nobody in the room is left behind.',
    sortingLine: 'Seekers of true hidden potential...',
    description: [
      'You recruit, onboard and look after BUCC’s members.',
      'A club is only as strong as its people, and you keep them together.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
  },
  {
    id: 'press',
    name: 'Press Release and Publications',
    patronus: 'Stag',
    bearer: 'Harry’s',
    accent: '#5fb4f7',
    flavor: 'Bold, steady and impossible to miss. Where you walk, the whole hall looks up.',
    sortingLine: 'Relentless chroniclers of absolute truth...',
    description: [
      'You write BUCC’s announcements, articles, newsletters and reports.',
      'What the club does becomes the record people read and share.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
  },
  {
    id: 'rnd',
    name: 'Research and Development',
    patronus: 'Doe',
    bearer: 'Snape’s',
    accent: '#4fe3c6',
    flavor: 'Quiet, devoted and always a step ahead. You lead others to what they did not know they needed.',
    sortingLine: 'Restless pioneers charting unknown magic...',
    description: [
      'You explore new tech, run projects and build tools for the club.',
      'Prototypes, experiments and learning in public, one idea at a time.',
    ],
    groupChatUrl: '[PLACEHOLDER]',
  },
] as const;

export const DEPARTMENT_IDS: readonly string[] = DEPARTMENTS.map((d) => d.id);

export function getDepartment(id: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.id === id);
}

/** "Harry’s Stag" */
export function patronusLabel(d: Department): string {
  return `${d.bearer} ${d.patronus}`;
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
  label: 'BUCC Orientation Fall 26',
  title: 'The Sorting Ceremony',
} as const;
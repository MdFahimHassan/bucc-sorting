import { STUDENT_ID_EXAMPLE, STUDENT_ID_PATTERN } from '../config/departments';
import { normalizeId } from './normalize';

/** Returns a friendly error message, or null when the input looks like a student ID. */
export function validateIdInput(raw: string): string | null {
  const id = normalizeId(raw);
  if (id === '') return 'The map needs your student ID first.';
  if (!STUDENT_ID_PATTERN.test(id)) {
    return `That does not look like a student ID. Try 8 digits, like ${STUDENT_ID_EXAMPLE}.`;
  }
  return null;
}

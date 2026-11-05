export interface Question { id: string; options: string[]; multiSelect: boolean; allowText: boolean }
export type Answers = Record<string, string[]>;
export function validateAnswers(questions: Question[], answers: Answers): Answers {
  if (!questions.length || new Set(questions.map(q=>q.id)).size !== questions.length || Object.keys(answers).length !== questions.length) throw new Error('Invalid questions or answer count');
  const result: Answers = Object.create(null);
  for (const q of questions) {
    const values = Object.hasOwn(answers,q.id) ? answers[q.id] : undefined;
    if (!Array.isArray(values) || !values.length || (!q.multiSelect && values.length !== 1) || values.length > 32 || new Set(values).size !== values.length) throw new Error('Invalid selection');
    if (values.some(v => typeof v !== 'string' || !v.trim() || v.length > 4000 || (!q.allowText && !q.options.includes(v)))) throw new Error('Invalid answer');
    result[q.id] = [...values];
  }
  return result;
}

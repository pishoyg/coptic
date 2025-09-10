export interface Abbreviation {
  fullForm: string;
  category: string;
}

export const MAPPING: Record<string, Abbreviation> = {
  acc: { fullForm: 'accusative', category: 'Grammatical' },
  adj: { fullForm: 'adjective', category: 'Grammatical' },
  Ar: { fullForm: 'Arabic', category: 'Linguistic' },
  ar: { fullForm: 'Arabic', category: 'Linguistic' },
  art: { fullForm: 'article', category: 'Grammatical' },
  c: { fullForm: 'constructed with (of verbs)', category: 'Grammatical' },
  caus: { fullForm: 'causative verb', category: 'Grammatical' },
  cit: {
    fullForm: 'cited, quoted in following place',
    category: 'Instructional',
  },
  dem: { fullForm: 'demotic', category: 'Linguistic' },
  diff: {
    fullForm: 'different reading, not useful for comparison',
    category: 'Instructional',
  },
  do: {
    fullForm: 'ditto, same as last word cited in this dialect',
    category: 'Instructional',
  },
  esp: { fullForm: 'especially', category: 'Instructional' },
  f: { fullForm: 'feminine', category: 'Grammatical' },
  gen: { fullForm: 'genitive', category: 'Grammatical' },
  Gk: { fullForm: 'Greek', category: 'Linguistic' },
  inf: { fullForm: 'infra', category: 'Instructional' },
  interj: { fullForm: 'interjection', category: 'Grammatical' },
  interrog: { fullForm: 'interrogative', category: 'Grammatical' },
  intr: {
    fullForm:
      'intransitive (i.e. verb without immediate object, or one constructed with prep. ⲉ-)',
    category: 'Grammatical',
  },
  l: { fullForm: 'legendum', category: 'Instructional' },
  lit: { fullForm: 'literally', category: 'Instructional' },
  m: { fullForm: 'masculine', category: 'Grammatical' },
  nn: { fullForm: 'noun', category: 'Grammatical' },
  obj: { fullForm: 'object', category: 'Grammatical' },
  om: { fullForm: 'omits, omitted', category: 'Instructional' },
  opp: {
    fullForm: 'as opposed to, contrasted with',
    category: 'Instructional',
  },
  paral: { fullForm: 'parallel word or phrase', category: 'Instructional' },
  pass: { fullForm: 'passim', category: 'Instructional' },
  'p c': { fullForm: 'conjunctive participle', category: 'Grammatical' },
  pl: { fullForm: 'plural', category: 'Grammatical' },
  poss: { fullForm: 'possessive pronoun', category: 'Grammatical' },
  pref: { fullForm: 'prefix', category: 'Grammatical' },
  prep: { fullForm: 'preposition', category: 'Grammatical' },
  pres: {
    fullForm: 'present tense, thus: 1 pres, 2 pres',
    category: 'Grammatical',
  },
  prob: { fullForm: 'probably', category: 'Instructional' },
  pron: { fullForm: 'pronoun', category: 'Grammatical' },
  qual: {
    fullForm: 'qualitative of verb; also indicated by †',
    category: 'Grammatical',
  },
  refl: { fullForm: 'reflexive use', category: 'Grammatical' },
  rel: { fullForm: 'relative', category: 'Grammatical' },
  's f': { fullForm: 'sub fine', category: 'Instructional' },
  sg: { fullForm: 'singular', category: 'Grammatical' },
  sim: {
    fullForm: 'similar in use or in meaning to the last quoted instance',
    category: 'Instructional',
  },
  suff: { fullForm: 'suffix', category: 'Grammatical' },
  tr: { fullForm: 'transitive', category: 'Grammatical' },
  V: { fullForm: 'vide', category: 'Instructional' },
  var: { fullForm: 'variant, in same dialect', category: 'Instructional' },
  vb: { fullForm: 'verb', category: 'Grammatical' },
};

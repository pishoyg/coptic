import * as str from '../str.js';
type Category =
  | 'Linguistic' // A language abbreviation.
  | 'Grammatical' // A grammatical abbreviation.
  | 'Instructional' // A general instructional abbreviation.
  | 'Coptic'; // A Coptic abbreviation.

export interface Annotation {
  // fullForm defines the full-form of the abbreviation, which is to be
  // presented to the user.
  fullForm: string;
  // category is, as of the time of writing, unused.
  category: Category;
  // noCaseVariant indicates that the first letter of this annotation retains
  // the case given below (either lower or upper), and never changes case.
  // If set to true, no case variants will be produced or processed for this
  // annotation.
  // We default to allowing case variants in order to increase our recall, at
  // the risk of reducing precision. Most annotations are safe to produce case
  // variants for, because collisions are unlikely, especially for the longer
  // ones.
  // Shorter abbreviations, however, are riskier because they have a higher
  // chance of colliding with other types of abbreviations.
  //
  // Keep this in mind when setting this field:
  // - If a given annotation is known to have never occurred with case
  //   variation, it should be excluded, because including it would be odd.
  // - If you see this abbreviation with a different case, would you read it as
  //   this annotation? Or could it possibly be something else?
  //
  // As of the time of writing, annotations are the least-priority type of
  // abbreviation. Our algorithm tries to parse a given
  // abbreviation as something else (such as a biblical or a non-biblical
  // reference) before trying to parse it as an annotation. Thus, increasing the
  // precision of annotation parsing is also accomplished by increasing the
  // recall of other (higher-priority) types of abbreviations.
  // #528 and #522 should therefore recover the precision loss resulting from
  // case flexibility.
  noCaseVariant?: boolean;
}

// NOTE: We exclude parentheses, although Crum had them in his list. They have
// different meaning based on whether they occur in the headings or elsewhere in
// the text, which is hard to discern by the parser.
export const MAPPING: Record<string, Annotation> = {
  acc: { fullForm: 'accusative', category: 'Grammatical' },
  adj: { fullForm: 'adjective', category: 'Grammatical' },
  ar: { fullForm: 'Arabic', category: 'Linguistic' },
  art: { fullForm: 'article', category: 'Grammatical' },
  c: {
    fullForm: 'constructed with (of verbs)',
    category: 'Grammatical',
    noCaseVariant: true,
  },
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
    noCaseVariant: true,
  },
  esp: { fullForm: 'especially', category: 'Instructional' },
  f: { fullForm: 'feminine', category: 'Grammatical', noCaseVariant: true },
  gen: { fullForm: 'genitive', category: 'Grammatical' },
  Gk: { fullForm: 'Greek', category: 'Linguistic', noCaseVariant: true },
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
  m: { fullForm: 'masculine', category: 'Grammatical', noCaseVariant: true },
  nn: { fullForm: 'noun', category: 'Grammatical', noCaseVariant: true },
  obj: { fullForm: 'object', category: 'Grammatical' },
  om: { fullForm: 'omits, omitted', category: 'Instructional' },
  opp: {
    fullForm: 'as opposed to, contrasted with',
    category: 'Instructional',
  },
  Ostr: { fullForm: 'ostracon', category: 'Instructional' },
  paral: { fullForm: 'parallel word or phrase', category: 'Instructional' },
  pass: { fullForm: 'passim', category: 'Instructional' },
  'p c': {
    fullForm: 'conjunctive participle',
    category: 'Grammatical',
  },
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
  '†': { fullForm: 'qualitative', category: 'Instructional' },
  '?': { fullForm: 'perhaps, possibly', category: 'Instructional' },
  // The following is somewhat unnecessary, but we include it for completion.
  // Crum had it in his list!
  ⲛ̅ⲉ̅: { fullForm: 'ⲛⲟⲩⲧⲉ', category: 'Coptic', noCaseVariant: true },
};

// The following abbreviations are not listed in Crum's List of Abbreviations,
// but they are nice to have.
// This list may grow as we discover more abbreviations that are worth tooltips.
MAPPING['MS'] = {
  fullForm: 'manuscript',
  category: 'Instructional',
  noCaseVariant: true,
};
MAPPING['MSS'] = {
  fullForm: 'manuscripts',
  category: 'Instructional',
  noCaseVariant: true,
};
MAPPING['cf'] = { fullForm: 'confer', category: 'Instructional' };
MAPPING['q v'] = { fullForm: 'quod vide', category: 'Instructional' };
MAPPING['s v'] = { fullForm: 'sub verbo', category: 'Instructional' };
MAPPING['sc'] = { fullForm: 'scilicet', category: 'Instructional' };
MAPPING['l c'] = { fullForm: 'loco citato', category: 'Instructional' };
MAPPING['Heb'] = {
  fullForm: 'Hebrew',
  category: 'Linguistic',
  noCaseVariant: true,
};

// TODO: (#511) Reconsider whether you want to retain this tip.
MAPPING['ib'] = { fullForm: 'ibidem', category: 'Instructional' };

Object.entries(MAPPING).forEach(
  ([key, annotation]: [string, Annotation]): void => {
    if (annotation.noCaseVariant) {
      return;
    }
    const variant: string = str.toggleCase(key.charAt(0)) + key.slice(1);
    MAPPING[variant] = annotation;
  }
);

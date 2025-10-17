import * as str from '../str.js';
import * as log from '../logger.js';
// NOTE:
// Crum also had the following entry in his list of abbreviations:
//     ( ) = Coptic letter inserted by editor, except in headings, where they
//     indicate variants or hypothetical forms.
// However, parentheses are not reflect in our list of annotations, due to the
// fact that they have different meaning based on whether they occur in the
// headings or elsewhere in the text, which is hard to discern by the parser. It
// would otherwise be confusing to show users the full definition.
export const MAPPING = {
  // SECTION 1: ABBREVIATIONS LISTED IN CRUM'S LIST OF ABBREVIATIONS.
  acc: { fullForm: 'accusative' },
  adj: { fullForm: 'adjective' },
  ar: { fullForm: 'Arabic' },
  art: { fullForm: 'article' },
  c: { fullForm: 'constructed with (of verbs)', noCaseVariant: true },
  caus: { fullForm: 'causative verb' },
  cit: { fullForm: 'cited, quoted in following place' },
  dem: { fullForm: 'demotic' },
  diff: { fullForm: 'different reading, not useful for comparison' },
  do: {
    fullForm: 'ditto, same as last word cited in this dialect',
    noCaseVariant: true,
  },
  esp: { fullForm: 'especially' },
  f: { fullForm: 'feminine', noCaseVariant: true },
  gen: { fullForm: 'genitive' },
  Gk: { fullForm: 'Greek', noCaseVariant: true },
  inf: { fullForm: 'infra' },
  interj: { fullForm: 'interjection' },
  interrog: { fullForm: 'interrogative' },
  intr: {
    fullForm:
      'intransitive (i.e. verb without immediate object, or one constructed with prep. ⲉ-)',
  },
  l: { fullForm: 'legendum' },
  lit: { fullForm: 'literally' },
  m: { fullForm: 'masculine', noCaseVariant: true },
  nn: { fullForm: 'noun', noCaseVariant: true },
  obj: { fullForm: 'object' },
  om: { fullForm: 'omits, omitted' },
  opp: { fullForm: 'as opposed to, contrasted with' },
  Ostr: { fullForm: 'ostracon' },
  paral: { fullForm: 'parallel word or phrase' },
  pass: { fullForm: 'passim' },
  'p c': { fullForm: 'conjunctive participle' },
  pl: { fullForm: 'plural' },
  poss: { fullForm: 'possessive pronoun' },
  pref: { fullForm: 'prefix' },
  prep: { fullForm: 'preposition' },
  pres: { fullForm: 'present tense, thus: 1 pres, 2 pres' },
  prob: { fullForm: 'probably' },
  pron: { fullForm: 'pronoun' },
  qual: { fullForm: 'qualitative of verb; also indicated by †' },
  refl: { fullForm: 'reflexive use' },
  rel: { fullForm: 'relative' },
  's f': { fullForm: 'sub fine' },
  sg: { fullForm: 'singular' },
  sim: { fullForm: 'similar in use or in meaning to the last quoted instance' },
  suff: { fullForm: 'suffix' },
  tr: { fullForm: 'transitive' },
  V: { fullForm: 'vide' },
  var: { fullForm: 'variant, in same dialect' },
  vb: { fullForm: 'verb' },
  '†': { fullForm: 'qualitative' },
  '?': { fullForm: 'perhaps, possibly' },
  // The following is somewhat unnecessary, but we include it for completion.
  // Crum had it in his list!
  ⲛ̅ⲉ̅: { fullForm: 'ⲛⲟⲩⲧⲉ', noCaseVariant: true },
  // SECTION 2: ABBREVIATIONS WE CHOOSE TO INCLUDE TO AID INTELLIGIBILITY.
  AD: { fullForm: 'Anno Domini', noCaseVariant: true },
  adv: { fullForm: 'adverb' },
  advb: { fullForm: 'adverb' },
  cf: { fullForm: 'confer' },
  'e g': { fullForm: 'exempli gratia' },
  Heb: { fullForm: 'Hebrew', noCaseVariant: true },
  'i e': { fullForm: 'id est' },
  'i q': { fullForm: 'idem quod' },
  // TODO: (#511) Reconsider whether you want to retain the annotation for ib.
  ib: { fullForm: 'ibidem' },
  improb: { fullForm: 'improbable' },
  'l c': { fullForm: 'loco citato' },
  MS: { fullForm: 'manuscript', noCaseVariant: true },
  MSS: { fullForm: 'manuscripts', noCaseVariant: true },
  p: { fullForm: 'page', noCaseVariant: true },
  'q v': { fullForm: 'quod vide' },
  's v': { fullForm: 'sub verbo' },
  sc: { fullForm: 'scilicet' },
  // SECTION 3: ABBREVIATIONS THAT MOSTLY APPEAR IN REFERENCE TITLES, OR PERHAPS
  // AS POSTFIXES:
  // TODO: (#522) Reconsider whether these abbreviations are needed when more
  // references are covered.
  // TODO: (#523) Reconsider whether the following abbreviations are needed
  // after postfixes are fully supported.
  Ad: { fullForm: 'Addenda', noCaseVariant: true },
  Lect: { fullForm: 'Lectionary', noCaseVariant: true },
  Mart: { fullForm: 'martyrdom', noCaseVariant: true },
  Sitz: { fullForm: 'Sitzungsberichte', noCaseVariant: true },
};
Object.entries(MAPPING).forEach(([key, annotation]) => {
  if (annotation.noCaseVariant) {
    return;
  }
  const variant = str.toggleCase(key.charAt(0)) + key.slice(1);
  if (variant === key) {
    // This key doesn't start with a letter that has cases.
    return;
  }
  log.ensure(
    !(variant in MAPPING),
    'duplicate annotation abbreviations:',
    variant
  );
  MAPPING[variant] = annotation;
});

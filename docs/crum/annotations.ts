import * as str from '../str.js';
import * as log from '../logger.js';

export interface Annotation {
  // fullForm defines the full-form of the abbreviation, which is to be
  // presented to the user.
  fullForm: string;
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

// NOTE:
// Crum also had the following entry in his list of abbreviations:
//     ( ) = Coptic letter inserted by editor, except in headings, where they
//     indicate variants or hypothetical forms.
// However, parentheses are not reflect in our list of annotations, due to the
// fact that they have different meaning based on whether they occur in the
// headings or elsewhere in the text, which is hard to discern by the parser. It
// would otherwise be confusing to show users the full definition.
export const MAPPING: Record<string, Annotation> = {
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
  // The following doesn't currently work because the text doesn't use the same
  // encoding for the horizontal bar as the one used here.
  ⲛ̅ⲉ̅: { fullForm: 'ⲛⲟⲩⲧⲉ', noCaseVariant: true },
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

  // SECTION 2: ABBREVIATIONS WE CHOOSE TO INCLUDE TO AID INTELLIGIBILITY.
  '1 sg': { fullForm: 'first person singular' },
  '2 sg': { fullForm: 'second person singular' },
  '3 sg': { fullForm: 'third person singular' },
  '1 pl': { fullForm: 'first person plural' },
  '2 pl': { fullForm: 'second person plural' },
  '3 pl': { fullForm: 'third person plural' },
  '&c': { fullForm: 'et cetera' },
  absol: { fullForm: 'absolute' },
  AD: { fullForm: 'Anno Domini', noCaseVariant: true },
  adv: { fullForm: 'adverb' },
  advb: { fullForm: 'adverb' },
  aor: { fullForm: 'aorist' },
  approx: { fullForm: 'approximate' }, // NOTE: Encountered only once, as of the time of writing!
  arithm: { fullForm: 'arithmetic' },
  bibl: { fullForm: 'biblical' }, // NOTE: Encountered only once, as of the time of writing!
  bis: { fullForm: 'bis' }, // Full form same as abbreviation, included for completion!
  constr: { fullForm: 'constructive' },
  construct: { fullForm: 'constructive' },
  cf: { fullForm: 'confer' },
  dat: { fullForm: 'dative' },
  demonstr: { fullForm: 'demonstrative' },
  'e g': { fullForm: 'exempli gratia' },
  Ethiop: { fullForm: 'Ethiopic' },
  frag: { fullForm: 'fragment' },
  fut: { fullForm: 'future' },
  Heb: { fullForm: 'Hebrew', noCaseVariant: true },
  Hebr: { fullForm: 'Hebrew', noCaseVariant: true },
  'i e': { fullForm: 'id est' },
  'i q': { fullForm: 'idem quod' },
  // TODO: (#511) Reconsider whether you want to retain the annotation for ib.
  ib: { fullForm: 'ibidem' },
  imper: { fullForm: 'imperative' },
  imperat: { fullForm: 'imperative' },
  impers: { fullForm: 'impersonal' },
  impf: { fullForm: 'imperfect' },
  improb: { fullForm: 'improbable' },
  'l c': { fullForm: 'loco citato' },
  MS: { fullForm: 'manuscript', noCaseVariant: true },
  MSS: { fullForm: 'manuscripts', noCaseVariant: true },
  neg: { fullForm: 'negative' },
  perf: { fullForm: 'perfect' },
  pf: { fullForm: 'perfect' },
  pluperf: { fullForm: 'plusquamperfect' },
  predic: { fullForm: 'predicate' },
  // TODO: (#194) "prepos" was only encountered once so far, and it was intended
  // to mean "prepositional". Could it also mean "preposition"?
  prepos: { fullForm: 'prepositional' },
  preter: { fullForm: 'preterite' },
  'q v': { fullForm: 'quod vide' },
  rad: { fullForm: 'radical' }, // NOTE: Encountered only once, as of the time of writing!
  's v': { fullForm: 'sub verbo' },
  sic: { fullForm: 'sic erat scriptum' },
  'sic l': { fullForm: 'sic lege' },
  sc: { fullForm: 'scilicet' },
  subj: { fullForm: 'subject' },
  sup: { fullForm: 'supra' },
  syr: { fullForm: 'Syriac' }, // NOTE: Encountered only once, as of the time of writing!
  transl: { fullForm: 'translation' }, // NOTE: Encountered only once, as of the time of writing!
  varr: { fullForm: 'variants' },
  ult: { fullForm: 'ultimo' },
  'ut sup': { fullForm: 'ut supra' },
  vbs: { fullForm: 'verbs' },
  viz: { fullForm: 'videlicet' },

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

Object.entries(MAPPING).forEach(
  ([key, annotation]: [string, Annotation]): void => {
    if (annotation.noCaseVariant) {
      return;
    }
    const variant: string = str.toggleCase(key.charAt(0)) + key.slice(1);
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
  }
);

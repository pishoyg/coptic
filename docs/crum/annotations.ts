import * as str from '../str.js';

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
};

// The following abbreviations are not listed in Crum's List of Abbreviations,
// but they are nice to have.
// This list may grow as we discover more abbreviations that are worth tooltips.
MAPPING['cf'] = { fullForm: 'confer' };
MAPPING['e g'] = { fullForm: 'exempli gratia' };
MAPPING['Heb'] = { fullForm: 'Hebrew', noCaseVariant: true };
MAPPING['i e'] = { fullForm: 'id est' };
// TODO: (#511) Reconsider whether you want to retain the annotation for ib.
MAPPING['ib'] = { fullForm: 'ibidem' };
MAPPING['l c'] = { fullForm: 'loco citato' };
MAPPING['MS'] = { fullForm: 'manuscript', noCaseVariant: true };
MAPPING['MSS'] = { fullForm: 'manuscripts', noCaseVariant: true };
MAPPING['q v'] = { fullForm: 'quod vide' };
MAPPING['s v'] = { fullForm: 'sub verbo' };
MAPPING['sc'] = { fullForm: 'scilicet' };

Object.entries(MAPPING).forEach(
  ([key, annotation]: [string, Annotation]): void => {
    if (annotation.noCaseVariant) {
      return;
    }
    const variant: string = str.toggleCase(key.charAt(0)) + key.slice(1);
    MAPPING[variant] = annotation;
  }
);

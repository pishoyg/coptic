import * as str from '../str.js';
import * as log from '../logger.js';

export interface Abbreviation {
  // fullForm defines the full-form of the abbreviation, which is to be
  // presented to the user.
  fullForm: string;
  variants: string[];
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
  // noStyledParent is used to eliminate some false positives. An annotation
  // marked with this field can't be the child of an <i> or <sup> tag.
  noStyledParent?: boolean;
  // noBoundary indicates that this annotation can occur as part of a word.
  // Most annotations occur as standalone words, but some are allowed to be part
  // of a word, or right next to one. For such annotations, use the noBoundary
  // field to indicate that mid-word matches are allowed.
  noBoundary?: boolean;
}

export interface Annotation {
  fullForm: string;
  noStyledParent?: boolean | undefined;
  noBoundary?: boolean | undefined;
}

// NOTE: We choose to use English, rather than Latin, names of tenses (perfect,
// future, etc. instead of perfectum, futurum, etc.) However, for abbreviations
// of Latin terms, we have to use the Latin term.
//
// NOTE:
// Crum also had the following entry in his list of abbreviations:
//     ( ) = Coptic letter inserted by editor, except in headings, where they
//     indicate variants or hypothetical forms.
// However, parentheses are not reflect in our list of annotations, due to the
// fact that they have different meaning based on whether they occur in the
// headings or elsewhere in the text, which is hard to discern by the parser. It
// would otherwise be confusing to show users the full definition.
export const DATA: Abbreviation[] = [
  // SECTION 1: ABBREVIATIONS LISTED IN CRUM'S LIST OF ABBREVIATIONS.
  { fullForm: 'accusative', variants: ['acc', 'accus'] },
  { fullForm: 'adjective', variants: ['adj'] },
  { fullForm: 'Arabic', variants: ['ar'] },
  { fullForm: 'article', variants: ['art'] },
  {
    fullForm: 'constructed with (of verbs)',
    variants: ['c'],
    noCaseVariant: true,
    noStyledParent: true,
  },
  { fullForm: 'causative verb', variants: ['caus'] },
  { fullForm: 'cited, quoted in following place', variants: ['cit'] },
  { fullForm: 'demotic', variants: ['dem'] },
  {
    fullForm: 'different reading, not useful for comparison',
    variants: ['diff'],
  },
  {
    fullForm: 'ditto, same as last word cited in this dialect',
    variants: ['do'],
    noCaseVariant: true,
  },
  { fullForm: 'especially', variants: ['esp'] },
  {
    fullForm: 'feminine',
    variants: ['f'],
    noCaseVariant: true,
    noStyledParent: true,
  },
  { fullForm: 'genitive', variants: ['gen'] },
  { fullForm: 'Greek', variants: ['Gk'], noCaseVariant: true },
  { fullForm: 'infra', variants: ['inf'] },
  { fullForm: 'interjection', variants: ['interj'] },
  { fullForm: 'interrogative', variants: ['interrog'] },
  {
    fullForm:
      'intransitive (i.e. verb without immediate object, or one constructed with prep. ⲉ-)',
    variants: ['intr'],
  },
  { fullForm: 'legendum', variants: ['l'] },
  { fullForm: 'literally', variants: ['lit'] },
  { fullForm: 'masculine', variants: ['m'], noCaseVariant: true },
  // The following doesn't currently work because the text doesn't use the same
  // encoding for the horizontal bar as the one used here.
  {
    fullForm: 'ⲛⲟⲩⲧⲉ',
    variants: ['ⲛ̅ⲉ̅'],
    noCaseVariant: true,
    noBoundary: true,
  },
  { fullForm: 'noun', variants: ['nn'], noCaseVariant: true },
  { fullForm: 'object', variants: ['obj'] },
  { fullForm: 'omits, omitted', variants: ['om'] },
  { fullForm: 'as opposed to, contrasted with', variants: ['opp'] },
  { fullForm: 'ostracon', variants: ['Ostr'] },
  { fullForm: 'parallel word or phrase', variants: ['paral'] },
  { fullForm: 'passim', variants: ['pass'] },
  { fullForm: 'conjunctive participle', variants: ['p c'] },
  { fullForm: 'plural', variants: ['pl'] },
  // Crum has "possessive pronoun" for "poss", but "possessive" is suitable. See
  // examples: https://remnqymi.com/crum/?query=poss&full=true&wiki=true.
  { fullForm: 'possessive', variants: ['poss'] },
  { fullForm: 'prefix', variants: ['pref'] },
  { fullForm: 'preposition', variants: ['prep'] },
  { fullForm: 'present tense, thus: 1 pres, 2 pres', variants: ['pres'] },
  { fullForm: 'probably', variants: ['prob'] },
  { fullForm: 'pronoun', variants: ['pron'] },
  { fullForm: 'qualitative of verb; also indicated by †', variants: ['qual'] },
  { fullForm: 'reflexive use', variants: ['refl', 'reflex'] },
  { fullForm: 'relative', variants: ['rel', 'relat'] },
  { fullForm: 'sub fine', variants: ['s f'] },
  { fullForm: 'singular', variants: ['sg'] },
  {
    fullForm: 'similar in use or in meaning to the last quoted instance',
    variants: ['sim'],
  },
  { fullForm: 'suffix', variants: ['suff'] },
  { fullForm: 'transitive', variants: ['tr'] },
  { fullForm: 'vide', variants: ['V'] },
  { fullForm: 'variant, in same dialect', variants: ['var'] },
  { fullForm: 'verb', variants: ['vb'] },
  { fullForm: 'qualitative', variants: ['†'], noBoundary: true },
  { fullForm: 'perhaps, possibly', variants: ['?'], noBoundary: true },

  // SECTION 2: ABBREVIATIONS WE CHOOSE TO INCLUDE TO AID INTELLIGIBILITY.
  { fullForm: 'first', variants: ['1st'] },
  { fullForm: 'second', variants: ['2d'] },
  { fullForm: 'third', variants: ['3d'] },

  { fullForm: 'first person singular', variants: ['1 sg', '1st sg'] },
  { fullForm: 'second person singular', variants: ['2 sg', '2d sg'] },
  { fullForm: 'third person singular', variants: ['3 sg', '3d sg'] },
  { fullForm: 'first person plural', variants: ['1 pl', '1st pl'] },
  { fullForm: 'second person plural', variants: ['2 pl', '2d pl'] },
  { fullForm: 'third person plural', variants: ['3 pl', '3d pl'] },

  { fullForm: 'first perfect', variants: ['1 perf', '1st perf'] },
  { fullForm: 'first present', variants: ['1 pres', '1st pres'] },
  { fullForm: 'first future', variants: ['1 fut', '1st fut'] },

  { fullForm: 'second perfect', variants: ['2 perf', '2d perf'] },
  { fullForm: 'second present', variants: ['2 pres', '2d pres'] },
  { fullForm: 'second future', variants: ['2 fut', '2d fut'] },

  // TODO: (#194) Is there a third perfect or third present?
  { fullForm: 'third future', variants: ['3 fut'] },

  { fullForm: 'et cetera', variants: ['&c'] },
  { fullForm: 'Appendix', variants: ['Append'] },
  { fullForm: 'absolute', variants: ['absol'] },
  { fullForm: 'according to', variants: ['acc to'] },
  { fullForm: 'Anno Domini', variants: ['AD'], noCaseVariant: true },
  { fullForm: 'adverb', variants: ['adv', 'advb'] },
  { fullForm: 'aorist', variants: ['aor'] },
  { fullForm: 'approximate', variants: ['approx', 'approxim'] },
  { fullForm: 'arithmetic', variants: ['arithm'] },
  { fullForm: 'auxiliary', variants: ['auxil'] },
  // NOTE: 'bibl' encountered only once, as of the time of writing!
  { fullForm: 'biblical', variants: ['bibl'] },
  // NOTE: 'bis' full form same as abbreviation, included for completion!
  { fullForm: 'bis', variants: ['bis'] },
  { fullForm: 'condition, conditional', variants: ['condit'] },
  { fullForm: 'conjunctive', variants: ['conj'] },
  { fullForm: 'constructive', variants: ['constr', 'construct'] },
  { fullForm: 'confer', variants: ['cf'] },
  { fullForm: 'Coptic', variants: ['Copt'], noCaseVariant: true },
  { fullForm: 'dative', variants: ['dat'] },
  { fullForm: 'dativus commodi', variants: ['dat commodi'] },
  { fullForm: 'demonstrative', variants: ['demonstr', 'demonst'] },
  { fullForm: 'determination', variants: ['determ', 'determin'] },
  {
    fullForm: 'East',
    variants: ['E'],
    noCaseVariant: true,
    noStyledParent: true,
  },
  { fullForm: 'exempli gratia', variants: ['e g'] },
  { fullForm: 'ethical dative', variants: ['ethic dat', 'ethic dative'] },
  { fullForm: 'Ethiopic', variants: ['Ethiop'] },
  { fullForm: 'equivalent', variants: ['equiv'] },
  { fullForm: 'etymology', variants: ['etymol'] },
  { fullForm: 'excluding', variants: ['exc'] },
  {
    fullForm: 'and the following pages/verses',
    variants: ['ff'],
    noCaseVariant: true,
  },
  { fullForm: 'fragment', variants: ['frag'] },
  { fullForm: 'future', variants: ['fut'] },
  { fullForm: 'Hebrew', variants: ['Heb', 'Hebr'], noCaseVariant: true },
  { fullForm: 'hieroglyphic', variants: ['hierogl'] },
  { fullForm: 'id est', variants: ['i e'] },
  { fullForm: 'idem quod', variants: ['i q'] },
  { fullForm: 'imperative', variants: ['imper', 'imperat'] },
  { fullForm: 'impersonal', variants: ['impers'] },
  { fullForm: 'imperfect', variants: ['impf'] },
  { fullForm: 'improbable', variants: ['improb'] },
  { fullForm: 'in loco', variants: ['in loc'] },
  { fullForm: 'infinitive', variants: ['infin'] },
  { fullForm: 'initio', variants: ['init'] },
  { fullForm: 'loco citato', variants: ['l c'] },
  { fullForm: 'loci citati', variants: ['ll cc'] },
  { fullForm: 'Latin', variants: ['Lat'], noCaseVariant: true },
  { fullForm: 'manuscript', variants: ['MS'], noCaseVariant: true },
  { fullForm: 'manuscripts', variants: ['MSS'], noCaseVariant: true },
  { fullForm: 'metaphor', variants: ['metaph'] },
  { fullForm: 'monastery', variants: ['monast'] },
  { fullForm: 'New Testament', variants: ['NTest'], noCaseVariant: true },
  {
    fullForm: 'North',
    variants: ['N'],
    noCaseVariant: true,
    noStyledParent: true,
  },
  { fullForm: 'negative', variants: ['neg'] },
  { fullForm: 'nominal', variants: ['nom'] },
  { fullForm: 'nomen nescio', variants: ['NN'], noCaseVariant: true },
  { fullForm: 'Old Testament', variants: ['OTest'], noCaseVariant: true },
  // NOTE: 'partic' encountered once, as of the time of writing!
  { fullForm: 'participle', variants: ['particip', 'partic'] },
  // NOTE: 'penes' full form same as abbreviation, included for completion!
  { fullForm: 'penes', variants: ['penes'] },
  { fullForm: 'perfect', variants: ['perf', 'pf'] },
  { fullForm: 'Persian', variants: ['Pers'], noCaseVariant: true },
  { fullForm: 'pluperfect', variants: ['pluperf'] },
  // NOTE: 'post-posit' encountered only once, as of the time of writing!
  { fullForm: 'postpositive', variants: ['post-posit'] },
  { fullForm: 'possessive', variants: ['possess'] },
  { fullForm: 'pages', variants: ['pp'] },
  { fullForm: 'predicate', variants: ['predic'] },
  { fullForm: 'prepositions', variants: ['preps'] },
  // NOTE: "prepos" was only encountered once so far, and it was intended
  // to mean "prepositional". Could it also mean "preposition"?
  { fullForm: 'prepositional', variants: ['prepos'] },
  { fullForm: 'preterite', variants: ['preter'] },
  { fullForm: 'prologue', variants: ['prol'] },
  { fullForm: 'quod vide', variants: ['q v'] },
  { fullForm: 'quae vide', variants: ['qq v'] },
  // NOTE: 'rad' encountered only once, as of the time of writing!
  { fullForm: 'radical', variants: ['rad'] },
  { fullForm: 'recto folio', variants: ['ro'], noCaseVariant: true },
  { fullForm: 'reference', variants: ['ref'] },
  {
    fullForm: 'South',
    variants: ['S'],
    noCaseVariant: true,
    noStyledParent: true,
  },
  { fullForm: 'sub voce', variants: ['s v'] },
  { fullForm: 'subjunctive', variants: ['subjunct'] },
  { fullForm: 'sic erat scriptum', variants: ['sic'] },
  { fullForm: 'sic lege', variants: ['sic l'] },
  { fullForm: 'scilicet', variants: ['sc'] },
  { fullForm: 'subject', variants: ['subj'] },
  // NOTE: 'subord' encountered only once, as of the time of writing!
  { fullForm: 'subordinate', variants: ['subord'] },
  { fullForm: 'supra', variants: ['sup', 'supra'] },
  // NOTE: 'syr' encountered only once, as of the time of writing!
  { fullForm: 'Syriac', variants: ['syr'] },
  { fullForm: 'translation, translated', variants: ['transl'] },
  { fullForm: 'variants', variants: ['varr', 'vars'] },
  { fullForm: 'ultimo', variants: ['ult'] },
  { fullForm: 'ut supra', variants: ['ut sup'] },
  { fullForm: 'verbal', variants: ['vbal'] },
  { fullForm: 'verbs', variants: ['vbs'] },
  { fullForm: 'videlicet', variants: ['viz'] },
  { fullForm: 'verso folio', variants: ['vo'] },
  {
    fullForm: 'West',
    variants: ['W'],
    noCaseVariant: true,
    noStyledParent: true,
  },

  // SECTION 3: ABBREVIATIONS THAT MOSTLY APPEAR IN REFERENCE TITLES, OR PERHAPS
  // AS POSTFIXES:
  // TODO: (#522) Reconsider whether these abbreviations are needed when more
  // references are covered.
  { fullForm: 'Addenda', variants: ['Ad'], noCaseVariant: true },
  { fullForm: 'Lectionary', variants: ['Lect'], noCaseVariant: true },
  { fullForm: 'martyrdom', variants: ['Mart'], noCaseVariant: true },
  { fullForm: 'Sitzungsberichte', variants: ['Sitz'], noCaseVariant: true },
  { fullForm: 'Assyrian', variants: ['Assyr'], noCaseVariant: true },
];

export const MAPPING: Record<string, Annotation> = {};
DATA.forEach((abb: Abbreviation): void => {
  abb.variants.forEach((key: string) => {
    const ann: Annotation = {
      fullForm: abb.fullForm,
      noStyledParent: abb.noStyledParent,
      noBoundary: abb.noBoundary,
    };
    MAPPING[key] = ann;
    if (abb.noCaseVariant) {
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
    MAPPING[variant] = ann;
  });
});

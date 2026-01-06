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
  // suffix indicates whether this annotation can occur as a Reference suffix.
  suffix?: boolean;
}

export interface Annotation {
  fullForm: string;
  noStyledParent?: boolean | undefined;
  suffix?: boolean | undefined;
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
  { fullForm: 'Arabic', variants: ['ar', 'arab'], suffix: true },
  // NOTE: 'art' is a common source of false positives, as it occasionally
  // refers to the copula (as in 'thou art' or 'art thou?').
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
    variants: ['f', 'Fem'],
    noCaseVariant: true,
    noStyledParent: true,
  },
  { fullForm: 'genitive', variants: ['gen'] },
  { fullForm: 'Greek', variants: ['Gk'], noCaseVariant: true },
  { fullForm: 'infra', variants: ['inf', 'infra'], suffix: true },
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
  // NOTE: 'ⲛ̅ⲉ̅' doesn't work, for two reasons:
  // - The text doesn't use the same encoding for the horizontal bar as the one
  //   used here.
  // - This usually occurs in the middle of a word, while the annotation regex
  //   prevents mid-word matches.
  {
    fullForm: 'ⲛⲟⲩⲧⲉ',
    variants: ['ⲛ̅ⲉ̅'],
    noCaseVariant: true,
  },
  { fullForm: 'noun', variants: ['nn'], noCaseVariant: true },
  { fullForm: 'object', variants: ['obj'] },
  { fullForm: 'omits, omitted', variants: ['om'] },
  { fullForm: 'as opposed to, contrasted with', variants: ['opp'] },
  { fullForm: 'ostracon', variants: ['Ostr'], suffix: true },
  { fullForm: 'parallel word or phrase', variants: ['paral'] },
  // NOTE: `pass` is a common source of false positives, as it often means
  // 'passive', and is sometimes the verb 'pass'
  { fullForm: 'passim', variants: ['pass'], suffix: true },
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
  { fullForm: 'sub fine', variants: ['s f'], suffix: true },
  { fullForm: 'singular', variants: ['sg'] },
  {
    fullForm: 'similar in use or in meaning to the last quoted instance',
    variants: ['sim'],
  },
  { fullForm: 'suffix', variants: ['suff'] },
  { fullForm: 'transitive', variants: ['tr'] },
  { fullForm: 'vide', variants: ['V', 'vid'] },
  { fullForm: 'variant, in same dialect', variants: ['var'] },
  { fullForm: 'verb', variants: ['vb'] },
  // NOTE: '†' is currently broken, for two reasons:
  // - It's usually part of <span class="coptic"> tags, which are excluded.
  // - This usually occurs right after a word, while the annotation regex uses a
  //   negative lookbehind to prevent such matches.
  { fullForm: 'qualitative', variants: ['†'] },
  // NOTE: The question mark is a very common annotation, but it also occurs as
  // a punctuation mark that doesn't need an annotation. Our heuristic to
  // distinguish the two is:
  // - If it immediately follows a word character, it's a punctuation mark.
  //   (This doesn't require any extra steps to implement, as the annotation
  //   regex would prevent such matches anyway.)
  // - If there is a preceding space or non-word character, it's the annotation.
  // This is good enough, although it produces (few) false negatives.
  { fullForm: 'perhaps, possibly', variants: ['?'] },

  // SECTION 2: ABBREVIATIONS WE CHOOSE TO INCLUDE TO AID INTELLIGIBILITY.
  // N.B. For a few Latin abbreviations (e.g. penes, contra, etc.) the full form
  // is always used, but we still add a tooltip for completion.
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

  { fullForm: 'third future', variants: ['3 fut'] },

  { fullForm: 'et cetera', variants: ['&c'] },
  { fullForm: 'Addenda', variants: ['Ad'], noCaseVariant: true, suffix: true },
  {
    fullForm: 'Assyrian',
    variants: ['Assyr'],
    noCaseVariant: true,
    suffix: true,
  },
  { fullForm: 'alchemical', variants: ['alchem'] },
  { fullForm: 'Appendix', variants: ['Append'], suffix: true },
  { fullForm: 'absolute', variants: ['absol'] },
  { fullForm: 'according to', variants: ['acc to'] },
  { fullForm: 'Anno Domini', variants: ['AD'], noCaseVariant: true },
  { fullForm: 'adverb, adverbial', variants: ['adv', 'advb'] },
  { fullForm: 'aorist', variants: ['aor'] },
  { fullForm: 'approximate', variants: ['approx', 'approxim'] },
  { fullForm: 'arithmetic', variants: ['arithm'] },
  { fullForm: 'auxiliary', variants: ['auxil'] },
  { fullForm: 'biblical', variants: ['bibl'] },
  { fullForm: 'bis', variants: ['bis'] },
  { fullForm: 'circa', variants: ['ca'] },
  { fullForm: 'condition, conditional', variants: ['condit'] },
  { fullForm: 'conjunctive', variants: ['conj'] },
  { fullForm: 'constructive', variants: ['constr', 'construct'] },
  { fullForm: 'confer', variants: ['cf'] },
  { fullForm: 'contra', variants: ['contra'] },
  { fullForm: 'Coptic', variants: ['Copt'], noCaseVariant: true, suffix: true },
  { fullForm: 'dative', variants: ['dat'] },
  { fullForm: 'dativus commodi', variants: ['dat commodi'] },
  { fullForm: 'definite', variants: ['def'] },
  { fullForm: 'demonstrative', variants: ['demonstr', 'demonst'] },
  { fullForm: 'determination', variants: ['determ', 'determin'] },
  { fullForm: 'duplicate', variants: ['duplic'] },
  {
    fullForm: 'East',
    variants: ['E'],
    noCaseVariant: true,
    noStyledParent: true,
  },
  { fullForm: 'exempli gratia', variants: ['e g'] },
  { fullForm: 'exemplorum gratia', variants: ['ee g'] },
  { fullForm: 'ethical dative', variants: ['ethic dat', 'ethic dative'] },
  { fullForm: 'Ethiopic', variants: ['Ethiop'] },
  { fullForm: 'equivalent', variants: ['equiv'] },
  { fullForm: 'etymology', variants: ['etymol'] },
  { fullForm: 'excluding', variants: ['exc'] },
  { fullForm: 'figurative', variants: ['figur'] },
  {
    fullForm: 'and the following pages/verses',
    variants: ['ff'],
    noCaseVariant: true,
    suffix: true,
  },
  { fullForm: 'fragment', variants: ['frag', 'fr'], suffix: true },
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
  { fullForm: 'indeclinable', variants: ['indecl'] },
  { fullForm: 'indefinite', variants: ['indef'] },
  { fullForm: 'infinitive', variants: ['infin'] },
  // NOTE: 'init' is a source of false positives. It occasionally means
  // 'initial'.
  { fullForm: 'initio', variants: ['init'] },
  { fullForm: 'loco citato', variants: ['l c', 'll c'], suffix: true },
  { fullForm: 'loci citati', variants: ['ll cc'], suffix: true },
  { fullForm: 'loquitur', variants: ['loq'] },
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
  { fullForm: 'neuter', variants: ['neut'] },
  { fullForm: 'nominal', variants: ['nom'] },
  { fullForm: 'nomen nescio', variants: ['NN'], noCaseVariant: true },
  // NOTE: While we add an annotation for 'nos', we exclude 'no' because it
  // would introduce too many false positives!
  { fullForm: 'numbers', variants: ['nos'], noCaseVariant: true },
  { fullForm: 'Old Testament', variants: ['OTest'], noCaseVariant: true },
  { fullForm: 'olim penes', variants: ['olim penes'] },
  { fullForm: 'optative', variants: ['optat'] },
  { fullForm: 'page', variants: ['p'], noCaseVariant: true, suffix: true },
  { fullForm: 'participle', variants: ['particip', 'partic'] }, // Encountered once (as of the time of writing).
  { fullForm: 'penes', variants: ['penes'] },
  { fullForm: 'perfect', variants: ['perf', 'pf'] },
  { fullForm: 'Persian', variants: ['Pers'], noCaseVariant: true },
  { fullForm: 'pluperfect', variants: ['pluperf'] },
  { fullForm: 'postpositive', variants: ['post-posit'] }, // Encountered once (as of the time of writing).
  { fullForm: 'possessive', variants: ['possess'] },
  { fullForm: 'pages', variants: ['pp'], suffix: true },
  { fullForm: 'predicate', variants: ['predic'] },
  { fullForm: 'prepositions', variants: ['preps'] },
  { fullForm: 'prepositional', variants: ['prepos'] }, // Encountered once (as of the time of writing).
  { fullForm: 'preterite', variants: ['preter'] },
  { fullForm: 'prologue', variants: ['prol'], suffix: true },
  { fullForm: 'quid ?', variants: ['quid ?'] },
  { fullForm: 'quod vide', variants: ['q v'] },
  { fullForm: 'quae vide', variants: ['qq v'] },
  { fullForm: 'radical', variants: ['rad'] }, // Encountered once (as of the time of writing).
  {
    fullForm: 'recto folio',
    variants: ['ro'],
    noCaseVariant: true,
    suffix: true,
  },
  { fullForm: 'reference', variants: ['ref'] },
  {
    fullForm: 'South',
    variants: ['S'],
    noCaseVariant: true,
    noStyledParent: true,
  },
  { fullForm: 'sub voce', variants: ['s v'] },
  { fullForm: 'subjunctive', variants: ['subjunct'] },
  { fullForm: 'substantive', variants: ['substant'] },
  { fullForm: 'sic erat scriptum', variants: ['sic'] },
  { fullForm: 'sic lege', variants: ['sic l'] },
  { fullForm: 'scilicet', variants: ['sc'] },
  { fullForm: 'subject', variants: ['subj'] },
  { fullForm: 'subordinate', variants: ['subord'] }, // Encountered once (as of the time of writing).
  { fullForm: 'superlative', variants: ['superlat'] },
  { fullForm: 'supra', variants: ['sup', 'supra'], suffix: true },
  { fullForm: 'Syriac', variants: ['syr'] }, // Encountered once (as of the time of writing).
  { fullForm: 'tabula', variants: ['tab'], suffix: true },
  { fullForm: 'title', variants: ['tit'], noCaseVariant: true },
  { fullForm: 'translation, translated', variants: ['transl'] },
  { fullForm: 'variants', variants: ['varr', 'vars'] },
  { fullForm: 'ultimo', variants: ['ult'] },
  { fullForm: 'uncatalogued', variants: ['uncatal'], suffix: true },
  { fullForm: 'unpublished', variants: ['unpubl'], suffix: true },
  { fullForm: 'ut supra', variants: ['ut sup'], suffix: true },
  { fullForm: 'verbal', variants: ['vbal'] },
  { fullForm: 'verbs', variants: ['vbs'] },
  { fullForm: 'videlicet', variants: ['viz'] },
  { fullForm: 'verso folio', variants: ['vo'], suffix: true },
  {
    fullForm: 'West',
    variants: ['W'],
    noCaseVariant: true,
    noStyledParent: true,
  },

  // SECTION 3: ABBREVIATIONS THAT MOSTLY APPEAR IN REFERENCE TITLES:
  // TODO: (#522) Reconsider whether these abbreviations are needed when more
  // references are covered.
  { fullForm: 'Lectionary', variants: ['Lect'], noCaseVariant: true },
  { fullForm: 'martyrdom', variants: ['Mart'], noCaseVariant: true },
  { fullForm: 'Sitzungsberichte', variants: ['Sitz'], noCaseVariant: true },
];

/**
 *
 * @param abb
 */
export function* variants(abb: Abbreviation): Generator<string> {
  for (const key of abb.variants) {
    yield key;
    if (abb.noCaseVariant) {
      continue;
    }
    const variant: string = str.toggleCase(key.charAt(0)) + key.slice(1);
    if (variant === key) {
      // This key doesn't start with a letter that has cases.
      continue;
    }
    yield variant;
  }
}

export const MAPPING: Record<string, Annotation> = {};
DATA.forEach((abb: Abbreviation): void => {
  const ann: Annotation = {
    fullForm: abb.fullForm,
    noStyledParent: abb.noStyledParent,
    suffix: abb.suffix,
  };
  Array.from(variants(abb)).forEach((variant: string) => {
    log.ensure(
      !(variant in MAPPING),
      'duplicate annotation abbreviations:',
      variant
    );
    MAPPING[variant] = ann;
  });
});

export const RE = new RegExp(str.regex(Object.keys(MAPPING)), 'gu');

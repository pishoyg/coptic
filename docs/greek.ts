export const DIACRITICS: Set<string> = new Set<string>([
  // Core Polytonic Accents and Breathings
  '\u0301', // COMBINING ACUTE ACCENT (tonos, oxia): ά
  '\u0300', // COMBINING GRAVE ACCENT (varia): ὰ
  '\u0342', // COMBINING GREEK PERISPOMENI (circumflex): ᾶ
  '\u0314', // COMBINING REVERSED COMMA ABOVE (rough breathing, daseia): ἁ
  '\u0313', // COMBINING COMMA ABOVE (smooth breathing, psili, also daseia equivalent): ἀ
  '\u0308', // COMBINING DIAERESIS (dialytika): ϊ

  // Iota Subscript
  '\u0345', // COMBINING GREEK YPOGEGRAMMENI (iota subscript): ᾳ

  // Other combining marks used in Greek contexts (pedagogical, specialized)
  '\u0304', // COMBINING MACRON (indicates long vowel, used in linguistics): ᾱ
  '\u0306', // COMBINING BREVE (indicates short vowel, used in linguistics): ᾰ
  '\u0307', // COMBINING DOT ABOVE (Less common in standard Greek, but a generic combining mark): ◌̇ (using a dotted circle for generic display)
]);

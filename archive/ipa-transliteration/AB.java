import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;

public class AB {

  // The alphabet.
  public static final Character ALPHA = 'ⲁ';
  public static final Character BITA = 'ⲃ';
  public static final Character GAMMA = 'ⲅ';
  public static final Character DELTA = 'ⲇ';
  public static final Character EI = 'ⲉ';
  public static final Character SOOU = 'ⲋ';
  public static final Character ZITA = 'ⲍ';
  public static final Character EITA = 'ⲏ';
  public static final Character THITA = 'ⲑ';
  public static final Character IOTA = 'ⲓ';
  public static final Character KABBA = 'ⲕ';
  public static final Character LAULA = 'ⲗ';
  public static final Character MI = 'ⲙ';
  public static final Character NI = 'ⲛ';
  public static final Character XI = 'ⲝ';
  public static final Character OMICRON = 'ⲟ';
  public static final Character PI = 'ⲡ';
  public static final Character RO = 'ⲣ';
  public static final Character SIMA = 'ⲥ';
  public static final Character TAU = 'ⲧ';
  public static final Character UA = 'ⲩ';
  public static final Character PHI = 'ⲫ';
  public static final Character KHI = 'ⲭ';
  public static final Character PSI = 'ⲯ';
  public static final Character OMEGA = 'ⲱ';
  public static final Character SHAI = 'ϣ';
  public static final Character FAI = 'ϥ';
  public static final Character KHAI = 'ϧ';
  public static final Character HORI = 'ϩ';
  public static final Character JANJA = 'ϫ';
  public static final Character CHIMA = 'ϭ';
  public static final Character TI = 'ϯ';

  // Vowels and consonants.
  public static final HashSet<Character> VOWELS =
      new HashSet<>(Arrays.asList(ALPHA, EI, IOTA, EITA, UA, OMICRON, OMEGA));
  public static final HashSet<Character> DRAGGING_VOWELS =
      new HashSet<>(Arrays.asList(EI, IOTA, EITA, UA));
  public static final HashSet<Character> COPTIC_UA_COMPATIBLE_VOWELS =
      // Vowels that can occur before the letter UA in Coptic words.
      new HashSet<>(Arrays.asList(ALPHA, EI, OMICRON));

  // Overline characters.
  public static final Character COMBINING_OVERLINE = 773;
  public static final Character COMBINING_MACRON = 772;
  public static final Character COMBINING_CONJOINING_MACRON = 65062;
  public static final Character STANDARD_OVERLINE = COMBINING_OVERLINE;
  public static final HashSet<Character> NONSTANDARD_COMBINING_OVERLINES =
      new HashSet<>(Arrays.asList(COMBINING_MACRON, COMBINING_CONJOINING_MACRON));

  // Jinkim characters.
  public static final Character COMBINING_GRAVE_ACCENT = 768;
  public static final Character GRAVE_ACCENT = 96;
  public static final Character COPTIC_MORPHOLOGICAL_DIVIDER = 11519;
  public static final Character COMBINING_COMMA_ABOVE_RIGHT = 789;
  public static final Character COMBINING_DOT_ABOVE = 775;
  public static final Character COMBINING_DOT_ABOVE_LEFT = 7672;
  public static final Character COMBINING_DOT_ABOVE_RIGHT = 856;
  public static final Character STANDARD_JINKIM = COMBINING_GRAVE_ACCENT;
  public static final HashSet<Character> NONSTANDARD_COMBINING_JINKIMS =
      new HashSet<>(Arrays.asList(
          COMBINING_COMMA_ABOVE_RIGHT,
          COMBINING_DOT_ABOVE,
          COMBINING_DOT_ABOVE_LEFT,
          COMBINING_DOT_ABOVE_RIGHT));
  public static final HashSet<Character> SPACING_JINKIMS =
      new HashSet<>(Arrays.asList(
          GRAVE_ACCENT,
          COPTIC_MORPHOLOGICAL_DIVIDER));
  public static final HashSet<Character> COPTIC_DIACRITICS = new HashSet<>(Arrays.asList(
      STANDARD_JINKIM,
      STANDARD_OVERLINE
  ));
  // Letters and glyphs.
  private static final HashSet<Character> COPTIC_LETTERS = new HashSet<>(Arrays.asList(
      ALPHA,
      BITA,
      GAMMA,
      DELTA,
      EI,
      SOOU,
      ZITA,
      EITA,
      THITA,
      IOTA,
      KABBA,
      LAULA,
      MI,
      NI,
      XI,
      OMICRON,
      PI,
      RO,
      SIMA,
      TAU,
      UA,
      PHI,
      KHI,
      PSI,
      OMEGA,
      SHAI,
      FAI,
      KHAI,
      HORI,
      JANJA,
      CHIMA,
      TI
  ));
  public static final HashSet<Character> COPTIC_GLYPHS = new HashSet<>() {{
    addAll(COPTIC_LETTERS);
    addAll(COPTIC_DIACRITICS);
  }};

  // Related helper methods.
  public static boolean isVowel(Character c) {
    return VOWELS.contains(c);
  }

  public static boolean isConsonant(Character c) {
    return !isVowel(c);
  }

  public static boolean isDraggingVowel(Character c) {
    return DRAGGING_VOWELS.contains(c);
  }

  public static boolean isCopticDiacritic(Character c) {
    return COPTIC_DIACRITICS.contains(c);
  }

  public static boolean isCopticUaCompatibleVowel(Character c) {
    return COPTIC_UA_COMPATIBLE_VOWELS.contains(c);
  }

  public static boolean isSpacingJinkim(Character c) {
    return SPACING_JINKIMS.contains(c);
  }

  public static StringBuilder deleteNonCopticGlyphs(StringBuilder sb) {
    return deleteLettersNotIn(sb, COPTIC_GLYPHS);
  }

  public static StringBuilder deleteNonCopticLetters(StringBuilder sb) {
    return deleteLettersNotIn(sb, COPTIC_LETTERS);
  }

  private static StringBuilder deleteLettersNotIn(StringBuilder sb, HashSet<Character> alphabet) {
    for (int i = 0; i < sb.length(); ) {
      if (!alphabet.contains(sb.charAt(i))) {
        sb.replace(i, i + 1, "");
      } else {
        i++;
      }
    }
    return sb;
  }

  public static boolean isCopticGlyph(Character c) {
    return COPTIC_GLYPHS.contains(c);
  }

  public static boolean isCopticLetter(Character c) {
    return COPTIC_LETTERS.contains(c);
  }

  public static ArrayList<String> splitAtNonCopticGlyphs(CharSequence line) {
    ArrayList<String> ans = new ArrayList<String>();
    for (int i = 0; i < line.length(); ++i) {
      while (i < line.length() && !isCopticGlyph(line.charAt(i))) {
        ++i;
      }
      final int start = i;
      while (i < line.length() && isCopticGlyph(line.charAt(i))) {
        ++i;
      }
      final int end = i;
      if (end != start) {
        ans.add(line.subSequence(start, end).toString());
      }
    }
    return ans;
  }

  public static boolean isAllCopticLetters(CharSequence word) {
    return word.chars().allMatch(c -> isCopticLetter((char) c));
  }

  public static boolean isAllCopticLettersOrSpace(CharSequence word) {
    return word.chars().allMatch(c -> isCopticLetter((char) c) || c == ' ');
  }

  public static void assertAllCopticLetters(CharSequence word) {
    if (!isAllCopticLetters(word)) {
      throw new IllegalArgumentException("Word was expected to be all Coptic letters: " + word.toString());
    }
  }

  public static void assertAllCopticLettersOrSpace(CharSequence word) {
    if (!isAllCopticLettersOrSpace(word)) {
      throw new IllegalArgumentException("Word was expected to be all Coptic letters or space: " + word.toString());
    }
  }
}

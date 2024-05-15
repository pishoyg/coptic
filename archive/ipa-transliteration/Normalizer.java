import java.util.HashMap;
import java.util.stream.Collectors;

public class Normalizer {

  private static final Substitutor NONSTANDARD_COMBINING_OVERLINE_SUBSTITUTOR = new Substitutor(
      AB.NONSTANDARD_COMBINING_OVERLINES.stream().collect(
          Collectors.toMap(
              x -> x.toString(),
              x -> AB.STANDARD_OVERLINE.toString(),
              (x, y) -> y,
              HashMap::new)));
  private static final Substitutor NONSTANDARD_COMBINING_JINKIM_SUBSTITUTOR = new Substitutor(
      AB.NONSTANDARD_COMBINING_JINKIMS.stream().collect(Collectors.toMap(
          x -> x.toString(),
          x -> AB.STANDARD_JINKIM.toString(),
          (x, y) -> y,
          HashMap::new
      ))
  );
  // >>>>> Abbreviations.
  //
  private static final Substitutor LETTER_ABBREVIATION_SUBSTITUTOR = new Substitutor(
      Helpers.convertCharacterToStringHashMap(new HashMap<Character, String>() {{
        put('ⳤ', "ⲕⲁⲓ");
        put('⳥', "ⲙⲁⲣⲧⲏⲣⲟⲥ");
        put('⳦', "ⲡⲣⲟⲥ");
        put('⳧', "ⲥⲧⲁⲩⲣⲟⲥ");
        put('⳨', "ⲧⲁⲩ-ⲣⲟ");
        put('⳩', "ⲭⲣⲓⲥⲧⲟⲥ");
        put('⳪', "ϭⲟⲓⲥ");
      }})
  );
  // TODO: Expand the word abbreviation substitutions list.
  private static final Substitutor WORD_ABBREVIATION_SUBSTITUTOR = new Substitutor(new HashMap<String, String>() {{
    put("ⲫϯ", "ⲫⲛⲟⲩϯ");

    putAll(buildCapitalizedAndAllSmallAbbreviations("ⲓⲏⲥ", "ⲓⲏⲥⲟⲩⲥ"));

    putAll(buildCapitalizedAndAllSmallAbbreviations("ⲓⲗⲏⲙ", "ⲓⲉⲣⲟⲥⲁⲗⲏⲙ"));

    putAll(buildCapitalizedAndAllSmallAbbreviations("ⲓⲥⲗ", "ⲓⲥⲣⲁⲏⲗ"));
    putAll(buildCapitalizedAndAllSmallAbbreviations("ⲓⲱⲁ", "ⲓⲱⲁⲛⲛⲏⲥ"));

    putAll(buildAllSmallAbbreviation("ⲇⲁⲇ", "ⲇⲁⲩⲓⲇ"));

    putAll(buildAllSmallAbbreviation("ⲁⲗ", "ⲁⲗⲗⲏⲗⲟⲩⲓⲁ"));

    putAll(buildAllSmallAbbreviation("ⲕⲉ", "ⲕⲩⲣⲓⲉ ⲉⲗⲉⲏⲥⲟⲛ"));

    putAll(buildAllSmallAbbreviation("ⲡⲛⲁ", "ⲡⲛⲉⲩⲙⲁ"));

    putAll(buildAllSmallAbbreviation("ⲉⲑⲩ", "ⲉⲑⲟⲩⲁⲃ"));
    putAll(buildAllSmallAbbreviation("ⲉⲑ", "ⲉⲑⲟⲩⲁⲃ"));

  }});
  private static final Substitutor NUMBER_SUBSTITUTOR = new Substitutor(new HashMap<>() {{
    put("ⲋ", "ⲥⲟⲟⲩ");
  }});

  public static String normalizeLine(CharSequence line) {
    return normalizeLine(new StringBuilder(line.toString().toLowerCase()));
  }

  private static String normalizeLine(StringBuilder line) {
    normalizeDiacritics(line);
    LETTER_ABBREVIATION_SUBSTITUTOR.modify(line);
    // TODO: Ensure that the encountered abbreviation-like subsequences are actually abbreviations.
    WORD_ABBREVIATION_SUBSTITUTOR.modify(line);
    normalizeNumbers(line);
    return AB.splitAtNonCopticGlyphs(line)
        .stream()
        .map(StringBuilder::new)
        .map(AB::deleteNonCopticLetters)
        .filter(x -> x.length() != 0)
        .collect(Collectors.joining(" "));
  }

  private static void stripDiacritics(StringBuilder sb) {
    // Remove extra diacritics at the beginning of the word.
    while (sb.length() >= 1 && AB.isCopticDiacritic(sb.charAt(0))) {
      sb.replace(0, 1, "");
    }
    // Remove extra diacritics at the end of the word.
    while (sb.length() >= 2 && AB.isCopticDiacritic(sb.charAt(sb.length() - 1)) && AB.isCopticDiacritic(sb.charAt(sb.length() - 2))) {
      sb.replace(sb.length() - 1, sb.length() - 2, "");
    }
  }

  private static void normalizeDiacritics(StringBuilder sb) {
    NONSTANDARD_COMBINING_JINKIM_SUBSTITUTOR.modify(sb);
    NONSTANDARD_COMBINING_OVERLINE_SUBSTITUTOR.modify(sb);
    for (int i = 0; i < sb.length(); ++i) {
      if (AB.isSpacingJinkim(sb.charAt(i))) {
        if (i == sb.length() - 1) {
          sb.replace(i, i + 1, "");
        } else {
          sb.replace(i, i + 1, String.valueOf(sb.charAt(i + 1)));
          sb.replace(i + 1, i + 2, AB.STANDARD_JINKIM.toString());
        }
      }
    }
  }

  private static void normalizeNumbers(StringBuilder word) {
    // TODO: implement number normalization.
    NUMBER_SUBSTITUTOR.modify(word);
  }

  private static HashMap<String, String> buildCapitalizedAbbreviation(CharSequence letters, String expansion) {
    AB.assertAllCopticLettersOrSpace(expansion);
    return new HashMap<>() {{
      put(buildAbbreviation(letters, true), expansion);
    }};
  }

  private static HashMap<String, String> buildAllSmallAbbreviation(CharSequence letters, String expansion) {
    AB.assertAllCopticLettersOrSpace(expansion);
    return new HashMap<>() {{
      put(buildAbbreviation(letters, false), expansion);
    }};
  }

  private static HashMap<String, String> buildCapitalizedAndAllSmallAbbreviations(CharSequence letters, String expansion) {
    return new HashMap<>() {{
      putAll(buildCapitalizedAbbreviation(letters, expansion));
      putAll(buildAllSmallAbbreviation(letters, expansion));
    }};
  }

  private static String buildAbbreviation(CharSequence letters, boolean capitalized) {
    if (letters.length() < 2) {
      throw new IllegalArgumentException("Illegal abbreviation length: " + letters.length());
    }
    StringBuilder abbreviation = new StringBuilder();
    for (int i = 0; i < letters.length(); ++i) {
      final Character c = letters.charAt(i);
      if (!AB.isCopticLetter(c)) {
        throw new IllegalArgumentException("Provided character is not a small Coptic letter.");
      }
      abbreviation.append(c);
      if (!capitalized || i != 0) {
        abbreviation.append(AB.STANDARD_OVERLINE);
      }
    }
    return abbreviation.toString();
  }
}

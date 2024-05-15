// >>>>> Nomenclature
//
// Letter: an Coptic alphabetical letter.
// Diacritic: a Coptic diacritic.
// Glyph: an Coptic alphabetical letter or a Coptic diacritic.
// Character: a unicode character.
// Auxiliary letter: an alphabetical letter that can be substituted for
//      by other letters.

import java.util.HashMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Helpers {

  private static final Pattern space = Pattern.compile(" ");

  public static boolean hasTwoConsonantsAt(CharSequence word, int startIdx) {
    return word.length() >= startIdx + 2 &&
        AB.isVowel(word.charAt(startIdx)) &&
        AB.isVowel(word.charAt(startIdx + 1));
  }

  public static HashMap<String, String> convertCharacterToStringHashMap(HashMap<Character, String> substitutions) {
    return substitutions.entrySet().stream().collect(Collectors.toMap(
        k -> k.getKey().toString(),
        k -> k.getValue(),
        (x, y) -> y,
        HashMap::new));
  }

  public static HashMap<String, String> convertCharacterToCharacterHashMap(HashMap<Character, Character> substitutions) {
    return substitutions.entrySet().stream().collect(Collectors.toMap(
        k -> k.getKey().toString(),
        k -> k.getValue().toString(),
        (x, y) -> y,
        HashMap::new));
  }

  public static Stream<String> splitLine(CharSequence normalizedLine) {
    return space.splitAsStream(normalizedLine);
  }
}

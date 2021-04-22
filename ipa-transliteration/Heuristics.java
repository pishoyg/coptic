import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;

public class Heuristics {

  private static final HashSet<Character> COPTIC_ONLY_LETTERS = new HashSet<>(Arrays.asList(
      AB.SHAI, AB.FAI, AB.KHAI, AB.HORI, AB.JANJA, AB.CHIMA, AB.TI
  ));
  private static final HashSet<Character> GREEK_ONLY_LETTERS = new HashSet<>(Arrays.asList(
      AB.GAMMA, AB.DELTA, AB.ZITA, AB.XI, AB.PSI
  ));
  private static final HashSet<String> COPTIC_ONLY_WORDS = new HashSet<>(Collections.singletonList("ⲁⲛⲍⲏⲃ"));
  private static final HashSet<String> GREEK_ONLY_WORDS = new HashSet<>(Arrays.asList("ⲭⲉⲣⲉ", "ⲭⲣⲓⲥⲧⲟⲥ"));

  // TODO: Improve the heuristic.
  public static boolean guessIfCoptic(CharSequence word) {
    if (isCertainlyCoptic(word)) return true;
    return !isCertainlyGreek(word);
    // If uncertain, then it's more likely that the word is Coptic!
  }

  private static boolean isCertainlyCoptic(CharSequence word) {
    if (COPTIC_ONLY_WORDS.contains(word)) {
      return true;
    }
    return word.chars().anyMatch(c -> COPTIC_ONLY_LETTERS.contains(c));
  }

  private static boolean isCertainlyGreek(CharSequence word) {
    if (GREEK_ONLY_WORDS.contains(word)) {
      return true;
    }
    if (word.chars().anyMatch(c -> GREEK_ONLY_LETTERS.contains(c))) {
      return true;
    }
    for (int i = 1; i < word.length(); ++i) {
      if (word.charAt(i) == AB.UA && !AB.isCopticUaCompatibleVowel(word.charAt(i - 1))) {
        return true;
      }
    }
    return false;
  }
}

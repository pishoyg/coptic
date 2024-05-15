import java.util.HashMap;
import java.util.stream.Stream;

// TODO: Improve the accuracy of the transliterator.
// TODO: Handle diacritics.
// TODO: The vowels need a lot of work.
// TODO: IOTA and UA can be both vowels and consonants.
// TODO: Handle diphthong.
public class Transliterator {

  private static final Substitutor GREEK_KHI_SUBSTITUTOR = new Substitutor(new HashMap<>() {{
    put("ⲭⲉ", "ϣⲉ");
    put("ⲭⲓ", "ϣⲓ");
    put("ⲭⲏ", "ϣⲏ");
    put("ⲭⲩ", "ϣⲩ");
    put("ⲭ", "ϧ");
  }});
  private static final Substitutor AUXILIARY_LETTER_SUBSTITUTOR = new Substitutor(new HashMap<>() {{
    put("ⲅⲅ", "ⲛⲅ");
    put("ⲅⲕ", "ⲛⲕ");
    put("ⲅⲝ", "ⲛⲕⲥ");
    put("ⲅⲭ", "ⲛⲭ");
    put("ⲝ", "ⲕⲥ");
    put("ⲯ", "ⲡⲥ");
    put("ϯ", "ⲧⲓ");
  }});
  private final Substitutor VOWELS_SUBSTITUTOR;
  private final Substitutor CONSONANTS_SUBSTITUTOR;

  public Transliterator(PhoneticAlphabet pa) {
    VOWELS_SUBSTITUTOR = new Substitutor(new HashMap<>() {{
      put("ⲁ", pa.getAlpha());
      put("ⲉ$", pa.getLongEi());
      put("ⲉ", pa.getShortEi());
      put("ⲏ", pa.getEita());
      put("ⲓ", pa.getIota());
      put("ⲟⲩ", pa.getOmicronUa());
      put("ⲟ", pa.getOmicron());
      put("ⲩ", pa.getUa());
      put("ⲱ", pa.getOmega());
    }});

    CONSONANTS_SUBSTITUTOR = new Substitutor(new HashMap<>() {{
      put(AB.BITA.toString(), pa.getBita());
      put(AB.GAMMA.toString(), pa.getGamma());
      put(AB.DELTA.toString(), pa.getDelta());
      put(AB.ZITA.toString(), pa.getZita());
      put(AB.THITA.toString(), pa.getThita());
      put(AB.KABBA.toString(), pa.getKabba());
      put(AB.LAULA.toString(), pa.getLaula());
      put(AB.MI.toString(), pa.getMi());
      put(AB.NI.toString(), pa.getNi());
      put(AB.PI.toString(), pa.getPi());
      put(AB.RO.toString(), pa.getRo());
      put(AB.SIMA.toString(), pa.getSima());
      put(AB.TAU.toString(), pa.getTau());
      put(AB.PHI.toString(), pa.getPhi());
      put(AB.KHI.toString(), pa.getKhi());
      put(AB.SHAI.toString(), pa.getShai());
      put(AB.FAI.toString(), pa.getFai());
      put(AB.KHAI.toString(), pa.getKhai());
      put(AB.HORI.toString(), pa.getHori());
      put(AB.JANJA.toString(), pa.getJanja());
      put(AB.CHIMA.toString(), pa.getChima());
    }});
  }

  public Stream<StringBuilder> transliterateNormalizedLine(CharSequence normalizedWords) {
    return Helpers.splitLine(normalizedWords)
        .map(StringBuilder::new)
        .map(this::transliterateWord);
  }

  public StringBuilder transliterateWord(StringBuilder word) {
    final boolean guessedCoptic = Heuristics.guessIfCoptic(word);

    AUXILIARY_LETTER_SUBSTITUTOR.modify(word);

    // Serve special consonants (these might be reliant on others).
    if (!guessedCoptic) {
      GREEK_KHI_SUBSTITUTOR.modify(word);
    }

    // If a word starts with two consonants, prepend an 'ⲉ'.
    if (Helpers.hasTwoConsonantsAt(word.toString(), 0)) {
      word.insert(0, AB.EI.toString());
    }

    // Substitute other (easier) consonants.
    CONSONANTS_SUBSTITUTOR.modify(word);

    // Replace all vowels.
    VOWELS_SUBSTITUTOR.modify(word);

    return word;
  }
}

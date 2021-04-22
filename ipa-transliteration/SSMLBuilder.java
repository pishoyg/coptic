import java.util.stream.Collectors;
import java.util.stream.Stream;

public class SSMLBuilder {


  public static final String header = "<speak><!--USE_LUCID-->";
  public static final String footer = "</speak>";
  public static final String phonemeFormat = "<phoneme alphabet=\"ipa\" ph=\"%s\"></phoneme>";

  public static String buildSSMLFromWordList(Stream<StringBuilder> words) {
    return header
        + words
        .map(word -> String.format(phonemeFormat, word))
        .collect(Collectors.joining())
        + footer;
  }
}

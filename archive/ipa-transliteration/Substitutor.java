import java.util.HashMap;

public class Substitutor {

  private final HashMap<Integer, HashMap<String, String>> substitutions;

  public Substitutor(HashMap<String, String> substitutions) {
    this.substitutions = new HashMap<>();
    substitutions.forEach((k, v) -> {
      this.substitutions.putIfAbsent(k.length(), new HashMap<>());
      this.substitutions.get(k.length()).put(k, v);
    });
  }

  public void modify(StringBuilder sb) {
    this.substitutions.forEach((tokenLength, lengthSubstitutions) -> {
      for (int i = 0; i <= sb.length() - tokenLength; ++i) {
        final String token = sb.substring(i, i + tokenLength);
        if (lengthSubstitutions.containsKey(token)) {
          sb.replace(i, i + tokenLength, lengthSubstitutions.get(token));
        }
      }
    });
  }
}

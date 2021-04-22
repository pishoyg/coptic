import java.awt.*;
import java.awt.datatransfer.StringSelection;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.util.Scanner;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.atomic.AtomicInteger;

// TODO: Implement a second path that splits an input sentence into words,
// and retrieves the pronunciation for each word individually.

public class Main {

  // TODO-DO NOT SUBMIT: Change these constants to commandline flags.
  private static final String PronunciationsDBAddress =
      "coptic-naqlun-pronunciations" + ".db";
  private static final String VocabularyList          =
      "2020CopticNaqlunVocabularyList.csv";

  public static void main(String[] args)
      throws SQLException, IOException {
//     populateDatabase(PronunciationsDBAddress);
     normalizeAndTransliterateCommandlineInput();
  }

  public static void populateDatabase(String DBAddress) throws SQLException, IOException {
    final Transliterator t = new Transliterator(new USIPA());
    final PronunciationsDatabaseManager db = new PronunciationsDatabaseManager(DBAddress);
    db.createTable();
    AtomicInteger successCount = new AtomicInteger();
    AtomicInteger errorCount = new AtomicInteger();

    var timer = new Timer();
    var task = new TimerTask() {
      final Instant start = Instant.now();

      @Override public void run() {
        System.out.println(String.format(
            "At %d, successes: %d, failures: %d",
                Duration.between(start, Instant.now()).toMillis(), successCount.get(),
                errorCount.get()));
      }
    };

    timer.schedule(task, 0, 1000);

    try {
      (new BufferedReader(new FileReader(VocabularyList))).lines().map(
          Normalizer::normalizeLine).distinct().parallel().forEach(normalLine -> {
        final String ssml = SSMLBuilder.buildSSMLFromWordList(
            t.transliterateNormalizedLine(normalLine));
        try {
          db.insertOrIgnoreIntoTable(normalLine, ssml.getBytes());
          successCount.incrementAndGet();
        } catch (SQLException throwables) {
          throwables.printStackTrace();
          errorCount.incrementAndGet();
        }
      });
    } finally {
      db.close();
      timer.cancel();
      task.run();
    }
  }

  public static void normalizeAndTransliterateCommandlineInput() {
    final Scanner scanner = new Scanner(System.in);
    final Transliterator t = new Transliterator(new USIPA());
    while (true) {
      final String normalLine = Normalizer.normalizeLine(scanner.nextLine());
      final String ssml = SSMLBuilder.buildSSMLFromWordList(
          t.transliterateNormalizedLine(normalLine));
      System.out.println(normalLine);
      System.out.println(ssml);
      Toolkit.getDefaultToolkit().getSystemClipboard().setContents(
          new StringSelection(ssml), null);
    }
  }
}

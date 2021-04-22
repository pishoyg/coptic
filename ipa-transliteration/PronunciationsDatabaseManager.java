import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class PronunciationsDatabaseManager {

  private static final String     SQLiteConnectionStringPrefix = "jdbc:sqlite:";
  private static final String     CreateTableSql               =
      "CREATE TABLE IF NOT EXISTS pronunciations (word TEXT PRIMARY KEY, pronunciation " +
      "BLOB NOT NULL);";
  private static final String     InsertOrIgnoreSql            =
      "INSERT OR IGNORE INTO pronunciations (word, pronunciation) VALUES (?, ?);";
  private static final String     InsertOrReplaceSql           =
      "INSERT OR REPLACE INTO pronunciations (word, pronunciation) VALUES (?, ?);";
  private final        Connection conn;

  public PronunciationsDatabaseManager(final String DBAddress) throws SQLException {
    this.conn = DriverManager.getConnection(SQLiteConnectionStringPrefix + DBAddress);
  }

  public void createTable() throws SQLException {
    this.conn.createStatement().execute(CreateTableSql);
  }

  public void insertOrIgnoreIntoTable(String word, byte[] pronunciation)
      throws SQLException {
    insertIntoTable(word, pronunciation, false);
  }

  public void insertOrReplaceIntoTable(String word, byte[] pronunciation)
      throws SQLException {
    insertIntoTable(word, pronunciation, true);
  }

  public void close() throws SQLException {
    this.conn.close();
  }

  private void insertIntoTable(
      String word, byte[] pronunciation, boolean replace
                              ) throws SQLException {
    PreparedStatement pstmt = this.conn.prepareStatement(
        replace ? InsertOrReplaceSql : InsertOrIgnoreSql);
    pstmt.setString(1, word);
    pstmt.setBytes(2, pronunciation);
    pstmt.execute();
  }
}

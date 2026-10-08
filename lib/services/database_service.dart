import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

class DatabaseService {
  Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    final directory = await getApplicationDocumentsDirectory();
    final path = p.join(directory.path, 'receiptwise.db');
    _database = await openDatabase(path, version: 1, onCreate: (db, version) async {
      await db.execute('''
        CREATE TABLE expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          merchant_name TEXT NOT NULL,
          amount INTEGER NOT NULL,
          transaction_date TEXT NOT NULL,
          category TEXT NOT NULL,
          note TEXT,
          receipt_image_path TEXT,
          receipt_thumbnail_path TEXT,
          raw_ocr_text TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      ''');
      await db.execute('CREATE INDEX idx_expenses_date ON expenses(transaction_date)');
      await db.execute('CREATE INDEX idx_expenses_category ON expenses(category)');
    });
    return _database!;
  }

  Future<void> close() async {
    await _database?.close();
    _database = null;
  }
}

import '../models/expense.dart';
import '../services/database_service.dart';

class ExpenseRepository {
  ExpenseRepository(this._database);
  final DatabaseService _database;

  Future<int> insertExpense(Expense expense) async {
    final db = await _database.database;
    return db.insert('expenses', expense.toMap()..remove('id'));
  }

  Future<Expense?> getExpenseById(int id) async {
    final db = await _database.database;
    final rows = await db.query('expenses', where: 'id = ?', whereArgs: [id], limit: 1);
    return rows.isEmpty ? null : Expense.fromMap(rows.first);
  }

  Future<List<Expense>> getAllExpenses() async {
    final db = await _database.database;
    final rows = await db.query('expenses', orderBy: 'transaction_date DESC, id DESC');
    return rows.map(Expense.fromMap).toList();
  }

  Future<int> updateExpense(Expense expense) async {
    if (expense.id == null) throw ArgumentError('Expense cần id để cập nhật');
    final db = await _database.database;
    return db.update('expenses', expense.toMap()..remove('id'), where: 'id = ?', whereArgs: [expense.id]);
  }

  Future<int> deleteExpense(int id) async {
    final db = await _database.database;
    return db.delete('expenses', where: 'id = ?', whereArgs: [id]);
  }

  Future<List<Expense>> searchExpenses(String query, {String? category}) async {
    final all = await getAllExpenses();
    final needle = query.trim().toLowerCase();
    return all.where((item) {
      final matchesText = needle.isEmpty || item.merchantName.toLowerCase().contains(needle) || (item.note ?? '').toLowerCase().contains(needle);
      return matchesText && (category == null || item.category == category);
    }).toList();
  }

  Future<List<Expense>> getRecentExpenses({int limit = 5}) async {
    final all = await getAllExpenses();
    return all.take(limit).toList();
  }
}

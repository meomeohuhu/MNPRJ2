import '../models/expense.dart';

class AggregationService {
  static int monthlyTotal(Iterable<Expense> expenses, DateTime month) => expenses.where((item) => item.transactionDate.year == month.year && item.transactionDate.month == month.month).fold(0, (sum, item) => sum + item.amount);

  static int weeklyTotal(Iterable<Expense> expenses, DateTime date) {
    final start = _startOfWeek(date);
    final end = start.add(const Duration(days: 7));
    return expenses.where((item) => !item.transactionDate.isBefore(start) && item.transactionDate.isBefore(end)).fold(0, (sum, item) => sum + item.amount);
  }

  static Map<String, int> categoryDistribution(Iterable<Expense> expenses, {DateTime? month}) {
    final result = <String, int>{};
    for (final expense in expenses) {
      if (month != null && (expense.transactionDate.year != month.year || expense.transactionDate.month != month.month)) continue;
      result.update(expense.category, (value) => value + expense.amount, ifAbsent: () => expense.amount);
    }
    return result;
  }

  static List<int> dailySpending(Iterable<Expense> expenses, DateTime date) {
    final start = _startOfWeek(date);
    return List.generate(7, (index) {
      final day = start.add(Duration(days: index));
      return expenses.where((item) => _sameDate(item.transactionDate, day)).fold(0, (sum, item) => sum + item.amount);
    });
  }

  static DateTime _startOfWeek(DateTime date) {
    final day = DateTime(date.year, date.month, date.day);
    return day.subtract(Duration(days: day.weekday - DateTime.monday));
  }

  static bool _sameDate(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;
}

import 'package:flutter_test/flutter_test.dart';
import 'package:receiptwise/models/expense.dart';
import 'package:receiptwise/services/aggregation_service.dart';

void main() {
  final week = DateTime(2026, 10, 5);
  final expenses = [
    Expense(merchantName: 'A', amount: 100000, transactionDate: DateTime(2026, 10, 5), category: 'Food'),
    Expense(merchantName: 'B', amount: 50000, transactionDate: DateTime(2026, 10, 5), category: 'Study'),
    Expense(merchantName: 'C', amount: 70000, transactionDate: DateTime(2026, 10, 7), category: 'Food'),
    Expense(merchantName: 'D', amount: 200000, transactionDate: DateTime(2026, 9, 30), category: 'Travel'),
  ];

  test('weekly total includes only Monday-Sunday once', () {
    expect(AggregationService.weeklyTotal(expenses, week), 220000);
  });

  test('category distribution groups categories correctly', () {
    expect(AggregationService.categoryDistribution(expenses, month: week), {'Food': 170000, 'Study': 50000});
  });

  test('daily spending aggregates multiple transactions on one day', () {
    final daily = AggregationService.dailySpending(expenses, week);
    expect(daily[0], 150000);
    expect(daily[2], 70000);
    expect(daily.skip(3).every((amount) => amount == 0), isTrue);
  });

  test('empty input returns zero values', () {
    expect(AggregationService.weeklyTotal([], week), 0);
    expect(AggregationService.dailySpending([], week), everyElement(0));
  });
}

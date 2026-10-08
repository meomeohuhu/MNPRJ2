import 'package:intl/intl.dart';

final _currency = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);
final _date = DateFormat('dd/MM/yyyy', 'vi_VN');

String formatVnd(int amount) => _currency.format(amount);
String formatDate(DateTime date) => _date.format(date);
String formatShortDate(DateTime date) => DateFormat('dd/MM').format(date);
String formatPercent(double value) => '${(value * 100).toStringAsFixed(value * 100 >= 10 ? 0 : 1)}%';

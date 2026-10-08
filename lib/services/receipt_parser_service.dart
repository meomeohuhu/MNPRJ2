import '../models/receipt_parse_result.dart';

class ReceiptParserService {
  static const _totalKeywords = <String>[
    'TONG THANH TOAN',
    'TONG CONG',
    'THANH TIEN',
    'PHAI THANH TOAN',
    'SO TIEN THANH TOAN',
    'GRAND TOTAL',
    'AMOUNT DUE',
    'TOTAL',
  ];

  ReceiptParseResult parse(String rawText) {
    final normalized = _normalize(rawText);
    if (normalized.isEmpty) return const ReceiptParseResult(rawText: '');
    final lines = normalized.split('\n').map((line) => line.trim()).where((line) => line.isNotEmpty).toList();
    final candidates = <_AmountCandidate>[];
    for (var index = 0; index < lines.length; index++) {
      final line = lines[index];
      final amounts = _amountsIn(line);
      for (final amount in amounts) {
        var score = 10 - (index.clamp(0, 8) as int);
        final keywordIndex = _totalKeywords.indexWhere((keyword) => line.contains(keyword));
        if (keywordIndex >= 0) score += 100 - keywordIndex * 3;
        if (RegExp(r'\b(VAT|THUE|TAX|GIAM GIA|DISCOUNT|TIEN THUA|CHANGE|TRA LAI)\b').hasMatch(line)) score -= 45;
        if (line.contains('SUBTOTAL') || line.contains('TAM TINH')) score -= 65;
        if (line.contains('DON GIA') || line.contains('UNIT PRICE')) score -= 25;
        candidates.add(_AmountCandidate(amount, score, index));
      }
    }
    candidates.sort((a, b) => b.score.compareTo(a.score));
    final uniqueAmounts = <int>[];
    for (final candidate in candidates) {
      if (!uniqueAmounts.contains(candidate.amount)) uniqueAmounts.add(candidate.amount);
    }
    final best = candidates.where((item) => item.score > 15).toList();
    final selected = best.isEmpty ? null : best.first;
    final uncertain = <String>[];
    if (selected == null) {
      uncertain.add('totalAmount');
    } else if (best.length > 1 && (best[1].score == selected.score || (selected.amount - best[1].amount).abs() <= selected.amount * .05)) {
      uncertain.add('totalAmount');
    }
    final date = _findDate(lines);
    if (date == null) uncertain.add('transactionDate');
    final merchant = _findMerchant(lines);
    if (merchant == null) uncertain.add('merchantName');
    return ReceiptParseResult(
      rawText: rawText,
      merchantName: merchant,
      transactionDate: date,
      totalAmount: selected?.amount,
      amountCandidates: uniqueAmounts,
      uncertainFields: uncertain,
    );
  }

  String _normalize(String value) => value
      .replaceAll('\r', '\n')
      .split('\n')
      .map((line) => line.toUpperCase().replaceAll(RegExp(r'\s+'), ' ').trim())
      .join('\n')
      .trim();

  List<int> _amountsIn(String line) {
    final matches = RegExp(r'(?<![A-Z])\d[\d., ]{0,18}\d|(?<![A-Z])\d+').allMatches(line);
    return matches.map((match) => _toVnd(match.group(0)!)).where((amount) => amount > 0).toList();
  }

  int _toVnd(String raw) {
    final compact = raw.replaceAll(' ', '').replaceAll('.', '').replaceAll(',', '');
    return int.tryParse(compact.replaceAll(RegExp(r'\D'), '')) ?? 0;
  }

  DateTime? _findDate(List<String> lines) {
    final pattern = RegExp(r'(?<!\d)(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})(?!\d)');
    final now = DateTime.now();
    for (final line in lines) {
      final match = pattern.firstMatch(line);
      if (match == null) continue;
      final day = int.parse(match.group(1)!);
      final month = int.parse(match.group(2)!);
      var year = int.parse(match.group(3)!);
      if (year < 100) year += 2000;
      final date = DateTime(year, month, day);
      if (date.year == year && date.month == month && date.day == day && !date.isAfter(now.add(const Duration(days: 1)))) return date;
    }
    return null;
  }

  String? _findMerchant(List<String> lines) {
    final ignored = RegExp(r'(HOTLINE|TEL|DT|DIA CHI|ADDRESS|MST|TAX CODE|MA SO THUE|HÓA ĐƠN|HOA DON|INVOICE|NGAY|DATE|TOTAL|TONG|\d{5,})');
    for (final line in lines.take(10)) {
      final clean = line.replaceAll(RegExp(r'[^A-ZÀ-Ỹ0-9 &.\-]'), '').trim();
      if (clean.length < 3 || ignored.hasMatch(clean) || RegExp(r'^\d+$').hasMatch(clean)) continue;
      if (_amountsIn(clean).isNotEmpty && clean.split(' ').length <= 2) continue;
      return clean;
    }
    return null;
  }
}

class _AmountCandidate {
  const _AmountCandidate(this.amount, this.score, this.lineIndex);
  final int amount;
  final int score;
  final int lineIndex;
}

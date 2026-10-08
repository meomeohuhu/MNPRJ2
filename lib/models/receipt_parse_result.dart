class ReceiptParseResult {
  const ReceiptParseResult({
    required this.rawText,
    this.merchantName,
    this.transactionDate,
    this.totalAmount,
    this.amountCandidates = const [],
    this.uncertainFields = const [],
  });

  final String rawText;
  final String? merchantName;
  final DateTime? transactionDate;
  final int? totalAmount;
  final List<int> amountCandidates;
  final List<String> uncertainFields;
}

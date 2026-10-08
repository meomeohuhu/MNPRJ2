class Expense {
  const Expense({
    this.id,
    required this.merchantName,
    required this.amount,
    required this.transactionDate,
    required this.category,
    this.note,
    this.receiptImagePath,
    this.receiptThumbnailPath,
    this.rawOcrText,
    this.createdAt,
    this.updatedAt,
  });

  final int? id;
  final String merchantName;
  final int amount;
  final DateTime transactionDate;
  final String category;
  final String? note;
  final String? receiptImagePath;
  final String? receiptThumbnailPath;
  final String? rawOcrText;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Expense copyWith({
    int? id,
    String? merchantName,
    int? amount,
    DateTime? transactionDate,
    String? category,
    String? note,
    String? receiptImagePath,
    String? receiptThumbnailPath,
    String? rawOcrText,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => Expense(
        id: id ?? this.id,
        merchantName: merchantName ?? this.merchantName,
        amount: amount ?? this.amount,
        transactionDate: transactionDate ?? this.transactionDate,
        category: category ?? this.category,
        note: note ?? this.note,
        receiptImagePath: receiptImagePath ?? this.receiptImagePath,
        receiptThumbnailPath: receiptThumbnailPath ?? this.receiptThumbnailPath,
        rawOcrText: rawOcrText ?? this.rawOcrText,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  Map<String, Object?> toMap() => {
        'id': id,
        'merchant_name': merchantName,
        'amount': amount,
        'transaction_date': transactionDate.toIso8601String(),
        'category': category,
        'note': note,
        'receipt_image_path': receiptImagePath,
        'receipt_thumbnail_path': receiptThumbnailPath,
        'raw_ocr_text': rawOcrText,
        'created_at': (createdAt ?? DateTime.now()).toIso8601String(),
        'updated_at': (updatedAt ?? DateTime.now()).toIso8601String(),
      };

  factory Expense.fromMap(Map<String, Object?> map) => Expense(
        id: map['id'] as int?,
        merchantName: map['merchant_name'] as String,
        amount: (map['amount'] as num).toInt(),
        transactionDate: DateTime.parse(map['transaction_date'] as String),
        category: map['category'] as String,
        note: map['note'] as String?,
        receiptImagePath: map['receipt_image_path'] as String?,
        receiptThumbnailPath: map['receipt_thumbnail_path'] as String?,
        rawOcrText: map['raw_ocr_text'] as String?,
        createdAt: DateTime.tryParse(map['created_at'] as String? ?? ''),
        updatedAt: DateTime.tryParse(map['updated_at'] as String? ?? ''),
      );
}

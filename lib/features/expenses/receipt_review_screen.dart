import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';
import '../../models/expense.dart';
import '../../models/receipt_parse_result.dart';
import '../../providers/expense_provider.dart';

class ReceiptReviewScreen extends StatefulWidget {
  const ReceiptReviewScreen({super.key, required this.imageFile, required this.result});
  final File imageFile;
  final ReceiptParseResult result;
  @override
  State<ReceiptReviewScreen> createState() => _ReceiptReviewScreenState();
}

class _ReceiptReviewScreenState extends State<ReceiptReviewScreen> {
  late final merchantController = TextEditingController(text: widget.result.merchantName ?? '');
  late final amountController = TextEditingController(text: widget.result.totalAmount?.toString() ?? '');
  final noteController = TextEditingController();
  late DateTime? date = widget.result.transactionDate;
  String category = 'Food';
  final formKey = GlobalKey<FormState>();

  @override
  void dispose() { merchantController.dispose(); amountController.dispose(); noteController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final uncertain = widget.result.uncertainFields;
    return Scaffold(appBar: AppBar(title: const Text('Xác nhận hóa đơn')), body: Form(key: formKey, child: ListView(padding: const EdgeInsets.fromLTRB(20, 4, 20, 28), children: [
      ClipRRect(borderRadius: BorderRadius.circular(18), child: Image.file(widget.imageFile, height: 210, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(height: 210, color: Colors.black12, child: const Icon(Icons.broken_image_rounded, size: 48)))),
      const SizedBox(height: 14),
      if (uncertain.isNotEmpty) Container(padding: const EdgeInsets.all(13), decoration: BoxDecoration(color: Colors.orange.withOpacity(.12), borderRadius: BorderRadius.circular(14)), child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(Icons.info_outline_rounded, color: Colors.orange), SizedBox(width: 9), Expanded(child: Text('Một số trường chưa chắc chắn. Vui lòng kiểm tra và chỉnh sửa trước khi lưu.'))])),
      const SizedBox(height: 16),
      CustomTextField(controller: merchantController, label: 'Tên cửa hàng', prefixIcon: Icons.storefront_rounded, validator: (value) => value == null || value.trim().isEmpty ? 'Nhập tên cửa hàng' : null),
      const SizedBox(height: 13),
      CustomTextField(controller: amountController, label: 'Tổng tiền (VNĐ)', keyboardType: TextInputType.number, prefixIcon: Icons.payments_rounded, validator: (value) { final amount = int.tryParse((value ?? '').replaceAll(RegExp(r'\D'), '')) ?? 0; return amount <= 0 ? 'Số tiền phải lớn hơn 0' : null; }),
      const SizedBox(height: 13),
      CustomTextField(controller: TextEditingController(text: date == null ? '' : formatDate(date!)), label: 'Ngày giao dịch', readOnly: true, prefixIcon: Icons.calendar_month_rounded, onTap: () async { final picked = await showDatePicker(context: context, firstDate: DateTime(2020), lastDate: DateTime.now(), initialDate: date ?? DateTime.now()); if (picked != null) setState(() => date = picked); }),
      const SizedBox(height: 13),
      DropdownButtonFormField<String>(value: category, decoration: const InputDecoration(labelText: 'Danh mục', prefixIcon: Icon(Icons.category_rounded)), items: AppConstants.categories.entries.map((entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value))).toList(), onChanged: (value) => setState(() => category = value ?? 'Food')),
      const SizedBox(height: 13),
      CustomTextField(controller: noteController, label: 'Ghi chú (tùy chọn)', maxLines: 2, prefixIcon: Icons.notes_rounded),
      const SizedBox(height: 22),
      Consumer<ExpenseProvider>(builder: (context, provider, _) => PrimaryButton(label: 'Xác nhận & lưu', icon: Icons.save_rounded, isLoading: provider.isLoading, onPressed: () async {
        if (!formKey.currentState!.validate()) return;
        final amount = int.parse(amountController.text.replaceAll(RegExp(r'\D'), ''));
        final saved = await provider.saveExpense(Expense(merchantName: merchantController.text.trim(), amount: amount, transactionDate: date ?? DateTime.now(), category: category, note: noteController.text.trim().isEmpty ? null : noteController.text.trim(), rawOcrText: widget.result.rawText), sourceImage: widget.imageFile);
        if (saved && context.mounted) { Navigator.pop(context); }
      })),
      const SizedBox(height: 10),
      OutlinedButton.icon(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.refresh_rounded), label: const Text('Quét lại')),
    ])));
  }
}

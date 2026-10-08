import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';
import '../../models/expense.dart';
import '../../providers/expense_provider.dart';

class AddEditExpenseScreen extends StatefulWidget {
  const AddEditExpenseScreen({super.key, this.expense});
  final Expense? expense;
  @override
  State<AddEditExpenseScreen> createState() => _AddEditExpenseScreenState();
}

class _AddEditExpenseScreenState extends State<AddEditExpenseScreen> {
  late final merchantController = TextEditingController(text: widget.expense?.merchantName ?? '');
  late final amountController = TextEditingController(text: widget.expense?.amount.toString() ?? '');
  late final noteController = TextEditingController(text: widget.expense?.note ?? '');
  late final dateController = TextEditingController(text: formatDate(widget.expense?.transactionDate ?? DateTime.now()));
  late DateTime date = widget.expense?.transactionDate ?? DateTime.now();
  late String category = widget.expense?.category ?? 'Food';
  final formKey = GlobalKey<FormState>();

  @override
  void dispose() { merchantController.dispose(); amountController.dispose(); noteController.dispose(); dateController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final editing = widget.expense != null;
    return Scaffold(appBar: AppBar(title: Text(editing ? 'Sửa giao dịch' : 'Thêm giao dịch')), body: Form(key: formKey, child: ListView(padding: const EdgeInsets.fromLTRB(20, 4, 20, 28), children: [
      Text(editing ? 'Cập nhật thông tin' : 'Nhập khoản chi tiêu mới', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
      const SizedBox(height: 18),
      CustomTextField(controller: merchantController, label: 'Tên cửa hàng / nội dung', prefixIcon: Icons.storefront_rounded, validator: (value) => value == null || value.trim().isEmpty ? 'Tên không được để trống' : null),
      const SizedBox(height: 13),
      CustomTextField(controller: amountController, label: 'Số tiền (VNĐ)', keyboardType: TextInputType.number, prefixIcon: Icons.payments_rounded, validator: (value) { final amount = int.tryParse((value ?? '').replaceAll(RegExp(r'\D'), '')) ?? 0; return amount <= 0 ? 'Số tiền phải lớn hơn 0' : null; }),
      const SizedBox(height: 13),
      CustomTextField(controller: dateController, label: 'Ngày giao dịch', readOnly: true, prefixIcon: Icons.calendar_month_rounded, onTap: () async { final picked = await showDatePicker(context: context, firstDate: DateTime(2020), lastDate: DateTime.now(), initialDate: date); if (picked != null) setState(() { date = picked; dateController.text = formatDate(date); }); }),
      const SizedBox(height: 13),
      DropdownButtonFormField<String>(value: category, decoration: const InputDecoration(labelText: 'Danh mục', prefixIcon: Icon(Icons.category_rounded)), items: AppConstants.categories.entries.map((entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value))).toList(), onChanged: (value) => setState(() => category = value ?? 'Food')),
      const SizedBox(height: 13),
      CustomTextField(controller: noteController, label: 'Ghi chú (tùy chọn)', maxLines: 3, prefixIcon: Icons.notes_rounded),
      const SizedBox(height: 24),
      Consumer<ExpenseProvider>(builder: (context, provider, _) => PrimaryButton(label: editing ? 'Lưu thay đổi' : 'Lưu giao dịch', icon: Icons.save_rounded, isLoading: provider.isLoading, onPressed: () async {
        if (!formKey.currentState!.validate()) return;
        final amount = int.parse(amountController.text.replaceAll(RegExp(r'\D'), ''));
        final current = widget.expense;
        final expense = Expense(id: current?.id, merchantName: merchantController.text.trim(), amount: amount, transactionDate: date, category: category, note: noteController.text.trim().isEmpty ? null : noteController.text.trim(), receiptImagePath: current?.receiptImagePath, receiptThumbnailPath: current?.receiptThumbnailPath, rawOcrText: current?.rawOcrText, createdAt: current?.createdAt, updatedAt: DateTime.now());
        if (await provider.saveExpense(expense) && context.mounted) Navigator.pop(context);
      })),
    ])));
  }
}

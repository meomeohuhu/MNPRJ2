import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';
import '../../providers/expense_provider.dart';
import 'add_edit_expense_screen.dart';

class ExpenseDetailScreen extends StatelessWidget {
  const ExpenseDetailScreen({super.key, required this.expenseId});
  final int expenseId;

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ExpenseProvider>();
    final matches = provider.expenses.where((item) => item.id == expenseId).toList();
    final expense = matches.isEmpty ? null : matches.first;
    if (expense == null) return const Scaffold(body: AppErrorWidget(message: 'Không tìm thấy giao dịch'));
    return Scaffold(appBar: AppBar(title: const Text('Chi tiết giao dịch'), actions: [IconButton(onPressed: () async { await Navigator.push(context, MaterialPageRoute(builder: (_) => AddEditExpenseScreen(expense: expense))); }, icon: const Icon(Icons.edit_rounded)), IconButton(onPressed: () => _delete(context, provider, expense), icon: const Icon(Icons.delete_outline_rounded))]), body: ListView(padding: const EdgeInsets.fromLTRB(20, 4, 20, 28), children: [
      Card(child: Padding(padding: const EdgeInsets.all(22), child: Column(children: [CircleAvatar(radius: 31, backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(.12), child: Icon(Icons.receipt_long_rounded, size: 30, color: Theme.of(context).colorScheme.primary)), const SizedBox(height: 13), Text(expense.merchantName, textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)), const SizedBox(height: 8), Text(formatVnd(expense.amount), style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900, color: Theme.of(context).colorScheme.primary)), const SizedBox(height: 12), CategoryChip(category: expense.category)]))),
      const SizedBox(height: 14),
      Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(children: [_InfoRow(label: 'Ngày giao dịch', value: formatDate(expense.transactionDate), icon: Icons.calendar_month_rounded), _InfoRow(label: 'Đã tạo', value: formatDate(expense.createdAt ?? expense.transactionDate), icon: Icons.history_rounded), if (expense.note != null && expense.note!.isNotEmpty) _InfoRow(label: 'Ghi chú', value: expense.note!, icon: Icons.notes_rounded)]))),
      if (expense.receiptImagePath != null) ...[const SizedBox(height: 14), Text('Ảnh hóa đơn', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)), const SizedBox(height: 10), ClipRRect(borderRadius: BorderRadius.circular(18), child: Image.file(File(expense.receiptImagePath!), fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox(height: 120, child: Center(child: Text('Ảnh không còn tồn tại')))))],
    ]));
  }

  Future<void> _delete(BuildContext context, ExpenseProvider provider, dynamic expense) async {
    final accepted = await showDialog<bool>(context: context, builder: (dialogContext) => AlertDialog(title: const Text('Xóa giao dịch?'), content: const Text('Bạn có chắc muốn xóa giao dịch này không?'), actions: [TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Hủy')), FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Xóa'))])) ?? false;
    if (accepted && context.mounted) { await provider.deleteExpense(expense); if (context.mounted) Navigator.pop(context); }
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value, required this.icon});
  final String label;
  final String value;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 9), child: Row(children: [Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary), const SizedBox(width: 12), Expanded(child: Text(label)), Text(value, style: const TextStyle(fontWeight: FontWeight.w700))]));
}

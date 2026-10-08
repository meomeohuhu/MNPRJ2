import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/widgets/common_widgets.dart';
import '../../providers/expense_provider.dart';
import '../expenses/expense_detail_screen.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final searchController = TextEditingController();
  String? category;

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ExpenseProvider>(builder: (context, provider, _) {
      final items = provider.search(searchController.text, category: category);
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(padding: const EdgeInsets.fromLTRB(20, 14, 20, 4), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Lịch sử chi tiêu', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)), IconButton(onPressed: provider.load, icon: const Icon(Icons.refresh_rounded))])),
        Padding(padding: const EdgeInsets.fromLTRB(20, 8, 20, 8), child: TextField(controller: searchController, onChanged: (_) => setState(() {}), decoration: const InputDecoration(hintText: 'Tìm cửa hàng hoặc ghi chú', prefixIcon: Icon(Icons.search_rounded), suffixIcon: Icon(Icons.tune_rounded)))),
        SizedBox(height: 42, child: ListView(padding: const EdgeInsets.symmetric(horizontal: 20), scrollDirection: Axis.horizontal, children: [
          Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: const Text('Tất cả'), selected: category == null, onSelected: (_) => setState(() => category = null))),
          ...AppConstants.categories.entries.map((entry) => Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: Text(entry.value), selected: category == entry.key, onSelected: (_) => setState(() => category = entry.key)))),
        ])),
        const SizedBox(height: 8),
        Expanded(child: items.isEmpty ? const EmptyStateWidget(title: 'Không có giao dịch', message: 'Thử thay đổi từ khóa hoặc bộ lọc để tìm dữ liệu.', icon: Icons.search_off_rounded) : RefreshIndicator(onRefresh: provider.load, child: ListView.builder(padding: const EdgeInsets.fromLTRB(20, 4, 20, 28), itemCount: items.length, itemBuilder: (context, index) {
          final expense = items[index];
          return Padding(padding: const EdgeInsets.only(bottom: 10), child: ExpenseCard(expense: expense, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ExpenseDetailScreen(expenseId: expense.id!))), onDelete: () => _delete(context, provider, expense)));
        }))),
      ]);
    });
  }

  Future<void> _delete(BuildContext context, ExpenseProvider provider, dynamic expense) async {
    final accepted = await showDialog<bool>(context: context, builder: (dialogContext) => AlertDialog(title: const Text('Xóa giao dịch?'), content: const Text('Hành động này sẽ xóa giao dịch và ảnh hóa đơn liên quan khỏi thiết bị.'), actions: [TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Hủy')), FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Xóa'))])) ?? false;
    if (accepted && context.mounted) await provider.deleteExpense(expense);
  }
}

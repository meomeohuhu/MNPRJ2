import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';
import '../../providers/expense_provider.dart';
import '../../services/aggregation_service.dart';
import '../expenses/add_edit_expense_screen.dart';
import '../expenses/expense_detail_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.onNavigate});
  final ValueChanged<int> onNavigate;

  @override
  Widget build(BuildContext context) {
    return Consumer<ExpenseProvider>(builder: (context, provider, _) {
      final now = DateTime.now();
      final monthly = AggregationService.monthlyTotal(provider.expenses, now);
      final weekly = AggregationService.weeklyTotal(provider.expenses, now);
      final distribution = AggregationService.categoryDistribution(provider.expenses, month: now);
      final recent = provider.expenses.take(5).toList();
      return RefreshIndicator(
        onRefresh: provider.load,
        child: ListView(padding: const EdgeInsets.fromLTRB(20, 12, 20, 28), children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Xin chào 👋', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 3),
              Text('ReceiptWise', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
            ]),
            CircleAvatar(backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(.12), child: Icon(Icons.account_balance_wallet_rounded, color: Theme.of(context).colorScheme.primary)),
          ]),
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)]), borderRadius: BorderRadius.circular(24)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Tổng chi tiêu tháng này', style: TextStyle(color: Colors.white70)),
              const SizedBox(height: 8),
              Text(formatVnd(monthly), style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
              const SizedBox(height: 16),
              Row(children: [const Icon(Icons.trending_up_rounded, color: Colors.white70, size: 18), const SizedBox(width: 6), Text('${formatVnd(weekly)} trong tuần này', style: const TextStyle(color: Colors.white70))]),
            ]),
          ),
          const SizedBox(height: 16),
          LayoutBuilder(builder: (context, constraints) => Row(children: [
            Expanded(child: SizedBox(height: 118, child: SummaryCard(title: 'Tuần này', value: formatVnd(weekly), icon: Icons.date_range_rounded, color: const Color(0xFF10B981)))),
            const SizedBox(width: 12),
            Expanded(child: SizedBox(height: 118, child: SummaryCard(title: 'Hóa đơn', value: '${provider.expenses.length}', icon: Icons.receipt_rounded, color: const Color(0xFFF97316)))),
          ])),
          const SizedBox(height: 22),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Thao tác nhanh', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)), const SizedBox.shrink()]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _QuickAction(icon: Icons.document_scanner_rounded, label: 'Quét hóa đơn', color: const Color(0xFF4F46E5), onTap: () => onNavigate(2))),
            const SizedBox(width: 10),
            Expanded(child: _QuickAction(icon: Icons.add_rounded, label: 'Thêm thủ công', color: const Color(0xFF10B981), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AddEditExpenseScreen())))),
            const SizedBox(width: 10),
            Expanded(child: _QuickAction(icon: Icons.insights_rounded, label: 'Thống kê', color: const Color(0xFF7C3AED), onTap: () => onNavigate(3))),
          ]),
          const SizedBox(height: 24),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Giao dịch gần đây', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)), TextButton(onPressed: () => onNavigate(1), child: const Text('Xem tất cả'))]),
          const SizedBox(height: 4),
          if (recent.isEmpty)
            const EmptyStateWidget(title: 'Chưa có giao dịch', message: 'Quét hóa đơn hoặc thêm một khoản chi để bắt đầu theo dõi.', actionLabel: null)
          else
            ...recent.map((expense) => Padding(padding: const EdgeInsets.only(bottom: 10), child: ExpenseCard(expense: expense, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ExpenseDetailScreen(expenseId: expense.id!))))),
          if (distribution.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text('Danh mục tháng này', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            ...(() {
              final entries = distribution.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
              return entries.map((entry) => _CategorySummary(category: entry.key, amount: entry.value, total: monthly));
            })(),
          ],
        ]),
      );
    });
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({required this.icon, required this.label, required this.color, required this.onTap});
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => InkWell(onTap: onTap, borderRadius: BorderRadius.circular(16), child: Card(child: Padding(padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6), child: Column(children: [CircleAvatar(radius: 21, backgroundColor: color.withOpacity(.12), child: Icon(icon, color: color, size: 21)), const SizedBox(height: 8), Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700))])));
}

class _CategorySummary extends StatelessWidget {
  const _CategorySummary({required this.category, required this.amount, required this.total});
  final String category;
  final int amount;
  final int total;
  @override
  Widget build(BuildContext context) {
    final ratio = total == 0 ? 0.0 : amount / total;
    final color = AppConstants.categoryColors[category] ?? Colors.indigo;
    return Padding(padding: const EdgeInsets.only(bottom: 11), child: Row(children: [Icon(AppConstants.categoryIcons[category] ?? Icons.category_rounded, color: color, size: 19), const SizedBox(width: 10), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(AppConstants.categories[category] ?? category, style: const TextStyle(fontWeight: FontWeight.w700)), Text(formatVnd(amount), style: const TextStyle(fontWeight: FontWeight.w700))]), const SizedBox(height: 6), ClipRRect(borderRadius: BorderRadius.circular(8), child: LinearProgressIndicator(value: ratio, minHeight: 6, color: color, backgroundColor: color.withOpacity(.12)))]))]));
  }
}

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';
import '../../providers/expense_provider.dart';
import '../../services/aggregation_service.dart';

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ExpenseProvider>(builder: (context, provider, _) {
      final now = DateTime.now();
      final distribution = AggregationService.categoryDistribution(provider.expenses, month: now);
      final total = distribution.values.fold(0, (sum, value) => sum + value);
      final days = AggregationService.dailySpending(provider.expenses, now);
      final peak = days.isEmpty ? 0 : days.reduce((a, b) => a > b ? a : b);
      return ListView(padding: const EdgeInsets.fromLTRB(20, 14, 20, 28), children: [
        Text('Thống kê', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
        const SizedBox(height: 4),
        Text('Phân tích chi tiêu tháng ${now.month}/${now.year}', style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 18),
        Card(child: Padding(padding: const EdgeInsets.all(18), child: Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Tổng tháng này', style: Theme.of(context).textTheme.bodyMedium), const SizedBox(height: 5), Text(formatVnd(total), style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900))])), CircleAvatar(radius: 25, backgroundColor: Colors.indigo.withOpacity(.12), child: const Icon(Icons.insights_rounded, color: Colors.indigo))])),
        const SizedBox(height: 14),
        Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Theo danh mục', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)), const SizedBox(height: 14), SizedBox(height: 220, child: DonutChart(data: distribution, total: total)), const SizedBox(height: 12), ...distribution.entries.map((entry) => _LegendRow(category: entry.key, amount: entry.value, total: total))]))),
        const SizedBox(height: 14),
        Card(child: Padding(padding: const EdgeInsets.fromLTRB(18, 18, 18, 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Chi tiêu trong tuần', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)), const SizedBox(height: 8), SizedBox(height: 220, child: WeeklyBarChart(values: days)), const SizedBox(height: 4), Text(peak == 0 ? 'Chưa có dữ liệu chi tiêu trong tuần.' : 'Ngày chi tiêu cao nhất: ${formatVnd(peak)}', style: Theme.of(context).textTheme.bodySmall)]))),
      ]);
    });
  }
}

class _LegendRow extends StatelessWidget {
  const _LegendRow({required this.category, required this.amount, required this.total});
  final String category;
  final int amount;
  final int total;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 10), child: Row(children: [Container(width: 10, height: 10, decoration: BoxDecoration(color: AppConstants.categoryColors[category], shape: BoxShape.circle)), const SizedBox(width: 9), Expanded(child: Text(AppConstants.categories[category] ?? category)), Text(formatVnd(amount), style: const TextStyle(fontWeight: FontWeight.w700)), const SizedBox(width: 8), Text(formatPercent(total == 0 ? 0 : amount / total), style: Theme.of(context).textTheme.bodySmall)]));
}

class DonutChart extends StatefulWidget {
  const DonutChart({super.key, required this.data, required this.total});
  final Map<String, int> data;
  final int total;
  @override
  State<DonutChart> createState() => _DonutChartState();
}

class _DonutChartState extends State<DonutChart> with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 850))..forward();
  String? selected;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => GestureDetector(onTapUp: (details) {
        final box = context.findRenderObject() as RenderBox;
        final local = box.globalToLocal(details.globalPosition);
        final center = Offset(box.size.width / 2, box.size.height / 2);
        var angle = math.atan2(local.dy - center.dy, local.dx - center.dx) + math.pi / 2;
        if (angle < 0) angle += 2 * math.pi;
        var cursor = 0.0;
        for (final entry in widget.data.entries) {
          final sweep = widget.total == 0 ? 0 : entry.value / widget.total * 2 * math.pi;
          if (angle >= cursor && angle <= cursor + sweep) setState(() => selected = entry.key);
          cursor += sweep;
        }
      }, child: AnimatedBuilder(animation: controller, builder: (_, __) => CustomPaint(painter: _DonutPainter(data: widget.data, progress: controller.value, selected: selected), child: Center(child: Text(selected == null ? formatVnd(widget.total) : AppConstants.categories[selected] ?? selected!, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800))))));
}

class _DonutPainter extends CustomPainter {
  const _DonutPainter({required this.data, required this.progress, this.selected});
  final Map<String, int> data;
  final double progress;
  final String? selected;
  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = math.min(size.width, size.height) / 2 - 15;
    final background = Paint()..color = Colors.black.withOpacity(.06)..style = PaintingStyle.stroke..strokeWidth = 26;
    canvas.drawCircle(center, radius, background);
    final total = data.values.fold(0, (sum, value) => sum + value);
    if (total == 0) return;
    var start = -math.pi / 2;
    for (final entry in data.entries) {
      final sweep = entry.value / total * 2 * math.pi * progress;
      final paint = Paint()
        ..color = (AppConstants.categoryColors[entry.key] ?? Colors.indigo)
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.butt
        ..strokeWidth = selected == entry.key ? 31 : 25;
      canvas.drawArc(Rect.fromCircle(center: center, radius: radius), start + .025, math.max(0, sweep - .05), false, paint);
      start += entry.value / total * 2 * math.pi * progress;
    }
  }
  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) => oldDelegate.progress != progress || oldDelegate.data != data || oldDelegate.selected != selected;
}

class WeeklyBarChart extends StatefulWidget {
  const WeeklyBarChart({super.key, required this.values});
  final List<int> values;
  @override
  State<WeeklyBarChart> createState() => _WeeklyBarChartState();
}

class _WeeklyBarChartState extends State<WeeklyBarChart> with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 750))..forward();
  int? selected;
  @override
  void dispose() { controller.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => GestureDetector(onTapUp: (details) {
        final box = context.findRenderObject() as RenderBox;
        final width = box.size.width / 7;
        final index = (details.localPosition.dx / width).floor().clamp(0, 6);
        if (index < widget.values.length) setState(() => selected = index);
      }, child: AnimatedBuilder(animation: controller, builder: (_, __) => CustomPaint(painter: _BarPainter(values: widget.values, progress: controller.value, selected: selected))));
}

class _BarPainter extends CustomPainter {
  const _BarPainter({required this.values, required this.progress, this.selected});
  final List<int> values;
  final double progress;
  final int? selected;
  @override
  void paint(Canvas canvas, Size size) {
    final maxValue = values.isEmpty ? 0 : values.reduce((a, b) => a > b ? a : b);
    final chartHeight = size.height - 30;
    final barWidth = size.width / 7;
    final gridPaint = Paint()..color = Colors.black.withOpacity(.08)..strokeWidth = 1;
    for (var i = 0; i < 4; i++) canvas.drawLine(Offset(0, chartHeight - i * chartHeight / 3), Offset(size.width, chartHeight - i * chartHeight / 3), gridPaint);
    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    for (var i = 0; i < 7; i++) {
      final value = i < values.length ? values[i] : 0;
      final height = maxValue == 0 ? 0.0 : value / maxValue * (chartHeight - 10) * progress;
      final rect = RRect.fromRectAndRadius(Rect.fromLTWH(i * barWidth + barWidth * .27, chartHeight - height, barWidth * .46, height), const Radius.circular(8));
      final paint = Paint()..color = selected == i ? Colors.deepPurple : Colors.indigo.withOpacity(.72);
      canvas.drawRRect(rect, paint);
      final text = TextPainter(text: TextSpan(text: labels[i], style: const TextStyle(fontSize: 11, color: Colors.grey)), textDirection: TextDirection.ltr)..layout();
      text.paint(canvas, Offset(i * barWidth + (barWidth - text.width) / 2, chartHeight + 9));
    }
  }
  @override
  bool shouldRepaint(covariant _BarPainter oldDelegate) => oldDelegate.progress != progress || oldDelegate.selected != selected || oldDelegate.values != values;
}

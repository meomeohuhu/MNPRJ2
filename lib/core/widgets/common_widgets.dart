import 'dart:io';

import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../models/expense.dart';

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({super.key, required this.label, required this.onPressed, this.icon, this.isLoading = false});
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: isLoading ? null : onPressed,
        icon: isLoading ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(icon ?? Icons.check_rounded),
        label: Text(label),
      ),
    );
  }
}

class CustomTextField extends StatelessWidget {
  const CustomTextField({super.key, required this.controller, required this.label, this.hint, this.keyboardType, this.validator, this.maxLines = 1, this.readOnly = false, this.onTap, this.prefixIcon});
  final TextEditingController controller;
  final String label;
  final String? hint;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  final int maxLines;
  final bool readOnly;
  final VoidCallback? onTap;
  final IconData? prefixIcon;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      validator: validator,
      maxLines: maxLines,
      readOnly: readOnly,
      onTap: onTap,
      decoration: InputDecoration(labelText: label, hintText: hint, prefixIcon: prefixIcon == null ? null : Icon(prefixIcon)),
    );
  }
}

class CategoryChip extends StatelessWidget {
  const CategoryChip({super.key, required this.category, this.compact = false});
  final String category;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final color = AppConstants.categoryColors[category] ?? Theme.of(context).colorScheme.primary;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 9 : 11, vertical: compact ? 5 : 7),
      decoration: BoxDecoration(color: color.withOpacity(.12), borderRadius: BorderRadius.circular(30)),
      child: Text(AppConstants.categories[category] ?? category, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: compact ? 11 : 12)),
    );
  }
}

class SummaryCard extends StatelessWidget {
  const SummaryCard({super.key, required this.title, required this.value, required this.icon, required this.color});
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CircleAvatar(radius: 19, backgroundColor: color.withOpacity(.12), child: Icon(icon, color: color, size: 20)),
          const Spacer(),
          Text(title, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 4),
          Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
        ]),
      ),
    );
  }
}

class ExpenseCard extends StatelessWidget {
  const ExpenseCard({super.key, required this.expense, this.onTap, this.onDelete});
  final Expense expense;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final image = expense.receiptThumbnailPath;
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Row(children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: image == null
                  ? Container(width: 50, height: 50, color: Theme.of(context).colorScheme.primary.withOpacity(.1), child: Icon(Icons.receipt_long_rounded, color: Theme.of(context).colorScheme.primary))
                  : Image.file(File(image), width: 50, height: 50, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(width: 50, height: 50, color: Colors.indigo.withOpacity(.1), child: const Icon(Icons.receipt_long_rounded))),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(expense.merchantName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Row(children: [CategoryChip(category: expense.category, compact: true), const SizedBox(width: 8), Text(formatDate(expense.transactionDate), style: Theme.of(context).textTheme.bodySmall)]),
            ])),
            const SizedBox(width: 8),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(formatVnd(expense.amount), style: TextStyle(fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary)),
              if (onDelete != null) IconButton(visualDensity: VisualDensity.compact, onPressed: onDelete, icon: const Icon(Icons.more_horiz_rounded)),
            ]),
          ]),
        ),
      ),
    );
  }
}

class EmptyStateWidget extends StatelessWidget {
  const EmptyStateWidget({super.key, required this.title, required this.message, this.actionLabel, this.onAction, this.icon = Icons.receipt_long_outlined});
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(child: Padding(padding: const EdgeInsets.all(32), child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 64, color: Theme.of(context).colorScheme.primary.withOpacity(.55)),
      const SizedBox(height: 16),
      Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800), textAlign: TextAlign.center),
      const SizedBox(height: 8),
      Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
      if (actionLabel != null) ...[const SizedBox(height: 20), FilledButton.icon(onPressed: onAction, icon: const Icon(Icons.add_rounded), label: Text(actionLabel!))],
    ])));
  }
}

class LoadingWidget extends StatelessWidget {
  const LoadingWidget({super.key});
  @override
  Widget build(BuildContext context) => const Center(child: CircularProgressIndicator());
}

class AppErrorWidget extends StatelessWidget {
  const AppErrorWidget({super.key, required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) => EmptyStateWidget(title: 'Có lỗi xảy ra', message: message, actionLabel: onRetry == null ? null : 'Thử lại', onAction: onRetry, icon: Icons.error_outline_rounded);
}

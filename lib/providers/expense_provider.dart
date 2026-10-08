import 'dart:io';

import 'package:flutter/foundation.dart';

import '../models/expense.dart';
import '../repositories/expense_repository.dart';
import '../services/file_storage_service.dart';

class ExpenseProvider extends ChangeNotifier {
  ExpenseProvider({required this.repository, required this.storage});

  final ExpenseRepository repository;
  final FileStorageService storage;
  List<Expense> expenses = [];
  bool isLoading = false;
  String? errorMessage;

  Future<void> load() async {
    isLoading = true;
    notifyListeners();
    try {
      expenses = await repository.getAllExpenses();
      errorMessage = null;
    } catch (error) {
      errorMessage = 'Không thể tải dữ liệu: $error';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> saveExpense(Expense expense, {File? sourceImage}) async {
    isLoading = true;
    errorMessage = null;
    notifyListeners();
    try {
      var value = expense;
      if (sourceImage != null) {
        final saved = await storage.saveReceipt(sourceImage);
        value = expense.copyWith(receiptImagePath: saved.originalPath, receiptThumbnailPath: saved.thumbnailPath);
      }
      if (value.id == null) {
        final id = await repository.insertExpense(value);
        value = value.copyWith(id: id);
      } else {
        await repository.updateExpense(value.copyWith(updatedAt: DateTime.now()));
      }
      await load();
      return true;
    } catch (error) {
      errorMessage = 'Không thể lưu giao dịch: $error';
      isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteExpense(Expense expense) async {
    if (expense.id == null) return false;
    try {
      await repository.deleteExpense(expense.id!);
      final remaining = expenses.where((item) => item.id != expense.id).toList();
      final imagePaths = remaining.expand<String?>((item) => [item.receiptImagePath, item.receiptThumbnailPath]);
      await storage.deleteIfUnreferenced(expense.receiptImagePath, imagePaths);
      await storage.deleteIfUnreferenced(expense.receiptThumbnailPath, imagePaths);
      await load();
      return true;
    } catch (error) {
      errorMessage = 'Không thể xóa giao dịch: $error';
      notifyListeners();
      return false;
    }
  }

  List<Expense> search(String query, {String? category}) {
    final needle = query.trim().toLowerCase();
    return expenses.where((item) {
      final textMatch = needle.isEmpty || item.merchantName.toLowerCase().contains(needle) || (item.note ?? '').toLowerCase().contains(needle);
      return textMatch && (category == null || item.category == category);
    }).toList();
  }
}

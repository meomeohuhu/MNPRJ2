import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app/app.dart';
import 'providers/expense_provider.dart';
import 'repositories/expense_repository.dart';
import 'services/database_service.dart';
import 'services/file_storage_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final database = DatabaseService();
  final repository = ExpenseRepository(database);
  final storage = FileStorageService();
  runApp(
    ChangeNotifierProvider(
      create: (_) => ExpenseProvider(repository: repository, storage: storage)..load(),
      child: const ReceiptWiseApp(),
    ),
  );
}

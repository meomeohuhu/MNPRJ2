import 'package:flutter/material.dart';

import '../features/shell/main_shell.dart';
import 'theme/app_theme.dart';

class ReceiptWiseApp extends StatelessWidget {
  const ReceiptWiseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ReceiptWise',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      home: const MainShell(),
    );
  }
}

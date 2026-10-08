import 'package:flutter/material.dart';

import '../analytics/analytics_screen.dart';
import '../expenses/add_edit_expense_screen.dart';
import '../history/history_screen.dart';
import '../home/home_screen.dart';
import '../scanner/scanner_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});
  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(child: _page()),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'Trang chủ'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long_rounded), label: 'Lịch sử'),
          NavigationDestination(icon: Icon(Icons.document_scanner_outlined), selectedIcon: Icon(Icons.document_scanner_rounded), label: 'Quét hóa đơn'),
          NavigationDestination(icon: Icon(Icons.insights_outlined), selectedIcon: Icon(Icons.insights_rounded), label: 'Thống kê'),
        ],
      ),
    );
  }

  Widget _page() {
    switch (index) {
      case 1:
        return const HistoryScreen();
      case 2:
        return const ScannerScreen();
      case 3:
        return const AnalyticsScreen();
      default:
        return HomeScreen(onNavigate: (value) => setState(() => index = value));
    }
  }
}

import 'package:flutter/material.dart';

class AppTheme {
  static const indigo = Color(0xFF4F46E5);
  static const purple = Color(0xFF7C3AED);
  static const green = Color(0xFF10B981);

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(seedColor: indigo, brightness: Brightness.light);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme.copyWith(primary: indigo, secondary: purple, tertiary: green),
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      appBarTheme: const AppBarTheme(centerTitle: false, elevation: 0, backgroundColor: Colors.transparent),
      cardTheme: CardTheme(elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: indigo, width: 1.5)),
      ),
    );
  }

  static ThemeData get dark {
    final scheme = ColorScheme.fromSeed(seedColor: indigo, brightness: Brightness.dark);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme.copyWith(primary: const Color(0xFF818CF8), secondary: const Color(0xFFA78BFA), tertiary: const Color(0xFF34D399)),
      scaffoldBackgroundColor: const Color(0xFF0F172A),
      cardTheme: CardTheme(elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF1E293B),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
      ),
    );
  }
}

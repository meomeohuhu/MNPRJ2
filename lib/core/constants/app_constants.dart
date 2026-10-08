import 'package:flutter/material.dart';

class AppConstants {
  static const appName = 'ReceiptWise';
  static const categories = <String, String>{
    'Food': 'Ăn uống',
    'Study': 'Học tập',
    'Travel': 'Di chuyển',
    'Gear': 'Mua sắm / Thiết bị',
    'Entertainment': 'Giải trí',
  };
  static const categoryIcons = <String, IconData>{
    'Food': Icons.restaurant_rounded,
    'Study': Icons.menu_book_rounded,
    'Travel': Icons.directions_car_rounded,
    'Gear': Icons.shopping_bag_rounded,
    'Entertainment': Icons.movie_rounded,
  };
  static const categoryColors = <String, Color>{
    'Food': Color(0xFFF97316),
    'Study': Color(0xFF3B82F6),
    'Travel': Color(0xFF10B981),
    'Gear': Color(0xFF8B5CF6),
    'Entertainment': Color(0xFFEC4899),
  };
}

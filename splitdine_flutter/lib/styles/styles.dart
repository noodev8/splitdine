import 'package:flutter/material.dart';

class AppPadding {
  static const EdgeInsets screen = EdgeInsets.all(16);
  static const EdgeInsets card = EdgeInsets.all(12);
  static const EdgeInsets section = EdgeInsets.symmetric(vertical: 12);
}

class AppTextStyle {
  static const TextStyle title = TextStyle(fontSize: 18, fontWeight: FontWeight.bold);
  static const TextStyle error = TextStyle(color: Colors.red);
  static const TextStyle subtitle = TextStyle(color: Colors.grey);
}

class AppColors {
  static const Color primary = Colors.deepPurple;
  static const Color background = Color(0xFFF5F5F5);
}

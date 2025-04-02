import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../screens/login_screen.dart';

Future<bool> handleAuthFailure(BuildContext context, Map<String, dynamic> result) async {
  final returnCode = result['return_code'];

  if (returnCode == 'UNAUTHORIZED' || returnCode == 'TOKEN_EXPIRED') {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => LoginScreen()),
      (route) => false,
    );

    return true;
  }

  return false;
}

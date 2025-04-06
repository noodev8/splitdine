/*
===================================================================================================================================
splash_screen
===================================================================================================================================
Display logo and show loading symbol
Determine whether to request login or go straight to the Event Hub
===================================================================================================================================
Navigation:
Adter a little wait
Go directly to event_hub_screen or login page depending if user is logged in or not
===================================================================================================================================
*/

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../styles/app_styles.dart';
import 'event_hub_screen.dart';
import 'login_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    checkLoginStatus();
  }

  void checkLoginStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final userJson = prefs.getString('user');

    await Future.delayed(const Duration(milliseconds: 1500)); // splash effect

    // Check if widget is still mounted before using context
    if (!mounted) return;

    if (token != null && userJson != null) {
      final user = jsonDecode(userJson);
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => EventHubScreen(user: user, token: token),
        ),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => LoginScreen(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppStyles.backgroundColor,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 20),
            Text(
              'SplitDine',
              style: AppStyles.displaySmall.copyWith(
                color: AppStyles.primaryColor,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Split the bill, not the fun',
              style: AppStyles.bodyMedium.copyWith(
                color: AppStyles.secondaryColor,
              ),
            ),
            const SizedBox(height: 40),
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(AppStyles.primaryColor),
            ),
          ],
        ),
      ),
    );
  }
}

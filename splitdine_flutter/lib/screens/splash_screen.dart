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
import 'event_hub_screen.dart';
import 'login_screen.dart';

class SplashScreen extends StatefulWidget {
  @override
  _SplashScreenState createState() => _SplashScreenState();
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

    await Future.delayed(Duration(milliseconds: 1200)); // splash effect

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
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              'assets/SplitDine-Logo.png',
              height: 100,
            ),
            SizedBox(height: 24),
            Text(
              'SplitDine',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            SizedBox(height: 16),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}

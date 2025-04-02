import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';

void main() {
  runApp(SplitDineApp());
}

class SplitDineApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SplitDine',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.deepPurple,
        scaffoldBackgroundColor: Colors.grey[100],
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.deepPurple,
          foregroundColor: Colors.white,
        ),
        textTheme: TextTheme(
          bodyMedium: TextStyle(fontSize: 16.0),
          headlineSmall: TextStyle(fontSize: 20.0, fontWeight: FontWeight.bold), // ← Updated
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.deepPurple,
            foregroundColor: Colors.white,
            minimumSize: Size(120, 45),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(),
          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
      ),
      home: SplashScreen(),
    );
  }
}

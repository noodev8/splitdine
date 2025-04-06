import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';
// Import kept for easy switching to the style showcase
import 'screens/style_showcase_screen.dart';
import 'styles/app_styles.dart';

void main() {
  runApp(const SplitDineApp());
}

class SplitDineApp extends StatelessWidget {
  const SplitDineApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SplitDine',
      debugShowCheckedModeBanner: false,
      theme: AppStyles.getThemeData(),
      // Normal app flow
      home: SplashScreen(),

      // To see the style showcase again, comment out the line above and uncomment this line
      // home: const StyleShowcaseScreen(),
    );
  }
}

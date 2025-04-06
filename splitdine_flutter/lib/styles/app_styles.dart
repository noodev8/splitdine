/*
Shared styles for the SplitDine application
Contains colors, text styles, and other UI elements
Follows Material Design 3 principles for a clean, modern look
*/

import 'package:flutter/material.dart';

class AppStyles {
  // Color System
  // Primary colors
  static const Color primaryColor = Color(0xFF6750A4); // Deep purple
  static const Color primaryContainer = Color(0xFFEADDFF); // Light purple container
  static const Color onPrimaryContainer = Color(0xFF21005E); // Text on primary container

  // Secondary colors
  static const Color secondaryColor = Color(0xFF625B71); // Muted purple
  static const Color secondaryContainer = Color(0xFFE8DEF8); // Light secondary container
  static const Color onSecondaryContainer = Color(0xFF1E192B); // Text on secondary container

  // Tertiary colors
  static const Color tertiaryColor = Color(0xFF7D5260); // Muted pink
  static const Color tertiaryContainer = Color(0xFFFFD8E4); // Light pink container

  // Surface colors
  static const Color surfaceColor = Color(0xFFFFFBFE); // Almost white
  static const Color surfaceVariant = Color(0xFFE7E0EC); // Light purple-gray
  static const Color onSurface = Color(0xFF1C1B1F); // Almost black
  static const Color onSurfaceVariant = Color(0xFF49454F); // Dark gray

  // Background colors
  static const Color backgroundColor = Color(0xFFF6F5FA); // Very light purple-gray
  static const Color onBackground = Color(0xFF1C1B1F); // Almost black

  // Error colors
  static const Color errorColor = Color(0xFFB3261E); // Red
  static const Color errorContainer = Color(0xFFF9DEDC); // Light red container
  static const Color onErrorContainer = Color(0xFF410E0B); // Dark red text

  // Success colors
  static const Color successColor = Color(0xFF146C2E); // Green
  static const Color successContainer = Color(0xFFD3E5D9); // Light green container

  // Outline and divider
  static const Color outlineColor = Color(0xFF79747E); // Medium gray
  static const Color dividerColor = Color(0xFFCAC4D0); // Light gray

  // Text Styles with improved typography
  static const TextStyle displayLarge = TextStyle(
    fontSize: 57,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.25,
    height: 1.12,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle displayMedium = TextStyle(
    fontSize: 45,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.16,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle displaySmall = TextStyle(
    fontSize: 36,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.22,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle headlineLarge = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.25,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle headlineMedium = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.29,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle headlineSmall = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.33,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle titleLarge = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w500,
    letterSpacing: 0,
    height: 1.27,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle titleMedium = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.15,
    height: 1.5,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle titleSmall = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    height: 1.43,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.5,
    height: 1.5,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.25,
    height: 1.43,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle bodySmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.4,
    height: 1.33,
    color: onSurfaceVariant,
    fontFamily: 'Roboto',
  );

  static const TextStyle labelLarge = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    height: 1.43,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle labelMedium = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.5,
    height: 1.33,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  static const TextStyle labelSmall = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.5,
    height: 1.45,
    color: onSurface,
    fontFamily: 'Roboto',
  );

  // Button Styles with Material 3 design
  static final ButtonStyle filledButtonStyle = ElevatedButton.styleFrom(
    backgroundColor: primaryColor,
    foregroundColor: Colors.white,
    elevation: 0,
    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
    ),
    textStyle: labelLarge,
    minimumSize: const Size(64, 40),
  );

  static final ButtonStyle tonalButtonStyle = ElevatedButton.styleFrom(
    backgroundColor: secondaryContainer,
    foregroundColor: onSecondaryContainer,
    elevation: 0,
    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
    ),
    textStyle: labelLarge,
    minimumSize: const Size(64, 40),
  );

  static final ButtonStyle outlinedButtonStyle = OutlinedButton.styleFrom(
    foregroundColor: primaryColor,
    side: const BorderSide(color: outlineColor, width: 1),
    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
    ),
    textStyle: labelLarge,
    minimumSize: const Size(64, 40),
  );

  static final ButtonStyle textButtonStyle = TextButton.styleFrom(
    foregroundColor: primaryColor,
    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
    ),
    textStyle: labelLarge,
    minimumSize: const Size(64, 40),
  );

  // Input Decoration with cleaner design
  static InputDecoration inputDecoration(String label, {String? hint, Widget? prefixIcon, Widget? suffixIcon}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: prefixIcon,
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: surfaceColor,
      floatingLabelBehavior: FloatingLabelBehavior.auto,
      labelStyle: bodyMedium.copyWith(color: onSurfaceVariant),
      hintStyle: bodyMedium.copyWith(color: onSurfaceVariant.withOpacity(0.6)),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: const BorderSide(color: outlineColor),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: const BorderSide(color: outlineColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: const BorderSide(color: primaryColor, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: const BorderSide(color: errorColor),
      ),
      contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
    );
  }

  // Filled Input Decoration (alternative style)
  static InputDecoration filledInputDecoration(String label, {String? hint, Widget? prefixIcon, Widget? suffixIcon}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: prefixIcon,
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: surfaceVariant.withOpacity(0.5),
      floatingLabelBehavior: FloatingLabelBehavior.auto,
      labelStyle: bodyMedium.copyWith(color: onSurfaceVariant),
      hintStyle: bodyMedium.copyWith(color: onSurfaceVariant.withOpacity(0.6)),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: const BorderSide(color: primaryColor, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(4),
        borderSide: const BorderSide(color: errorColor),
      ),
      contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
    );
  }

  // Card Decorations
  static final BoxDecoration cardDecoration = BoxDecoration(
    color: surfaceColor,
    borderRadius: BorderRadius.circular(12),
    boxShadow: [
      BoxShadow(
        color: onSurface.withOpacity(0.08),
        offset: const Offset(0, 1),
        blurRadius: 3,
        spreadRadius: 0,
      ),
    ],
  );

  static final BoxDecoration elevatedCardDecoration = BoxDecoration(
    color: surfaceColor,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: onSurface.withOpacity(0.05),
        offset: const Offset(0, 1),
        blurRadius: 2,
        spreadRadius: 0,
      ),
      BoxShadow(
        color: onSurface.withOpacity(0.08),
        offset: const Offset(0, 3),
        blurRadius: 8,
        spreadRadius: 0,
      ),
    ],
  );

  static final BoxDecoration outlinedCardDecoration = BoxDecoration(
    color: surfaceColor,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: outlineColor.withOpacity(0.5), width: 1),
  );

  // Spacing system
  static const double spacing2 = 2.0;
  static const double spacing4 = 4.0;
  static const double spacing8 = 8.0;
  static const double spacing12 = 12.0;
  static const double spacing16 = 16.0;
  static const double spacing24 = 24.0;
  static const double spacing32 = 32.0;
  static const double spacing48 = 48.0;
  static const double spacing64 = 64.0;

  // Common padding
  static const EdgeInsets paddingSmall = EdgeInsets.all(spacing8);
  static const EdgeInsets paddingMedium = EdgeInsets.all(spacing16);
  static const EdgeInsets paddingLarge = EdgeInsets.all(spacing24);

  static const EdgeInsets paddingHorizontalSmall = EdgeInsets.symmetric(horizontal: spacing8);
  static const EdgeInsets paddingHorizontalMedium = EdgeInsets.symmetric(horizontal: spacing16);
  static const EdgeInsets paddingHorizontalLarge = EdgeInsets.symmetric(horizontal: spacing24);

  static const EdgeInsets paddingVerticalSmall = EdgeInsets.symmetric(vertical: spacing8);
  static const EdgeInsets paddingVerticalMedium = EdgeInsets.symmetric(vertical: spacing16);
  static const EdgeInsets paddingVerticalLarge = EdgeInsets.symmetric(vertical: spacing24);

  // Common border radius
  static final BorderRadius borderRadiusSmall = BorderRadius.circular(4);
  static final BorderRadius borderRadiusMedium = BorderRadius.circular(8);
  static final BorderRadius borderRadiusLarge = BorderRadius.circular(16);
  static final BorderRadius borderRadiusXLarge = BorderRadius.circular(28);

  // Animation durations
  static const Duration durationShort = Duration(milliseconds: 150);
  static const Duration durationMedium = Duration(milliseconds: 300);
  static const Duration durationLong = Duration(milliseconds: 500);

  // Chip styles
  static final BoxDecoration chipDecoration = BoxDecoration(
    color: surfaceVariant,
    borderRadius: BorderRadius.circular(8),
  );

  // List tile styles
  static const EdgeInsets listTilePadding = EdgeInsets.symmetric(vertical: 12, horizontal: 16);

  // Divider
  static const Divider divider = Divider(height: 1, thickness: 1, color: dividerColor);

  // Bottom sheet decoration
  static final BoxDecoration bottomSheetDecoration = BoxDecoration(
    color: surfaceColor,
    borderRadius: const BorderRadius.only(
      topLeft: Radius.circular(28),
      topRight: Radius.circular(28),
    ),
    boxShadow: [
      BoxShadow(
        color: onSurface.withOpacity(0.1),
        blurRadius: 10,
        spreadRadius: 0,
      ),
    ],
  );

  // App bar decoration
  static const AppBarTheme appBarTheme = AppBarTheme(
    backgroundColor: surfaceColor,
    foregroundColor: onSurface,
    elevation: 0,
    centerTitle: true,
  );

  // Glassmorphism effect
  static BoxDecoration glassDecoration = BoxDecoration(
    color: Colors.white.withOpacity(0.1),
    borderRadius: BorderRadius.circular(16),
    border: Border.all(color: Colors.white.withOpacity(0.2)),
    boxShadow: [
      BoxShadow(
        color: onSurface.withOpacity(0.05),
        blurRadius: 20,
        spreadRadius: 0,
      ),
    ],
  );

  // Create a Material 3 theme
  static ThemeData getThemeData() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme(
        brightness: Brightness.light,
        primary: primaryColor,
        onPrimary: Colors.white,
        primaryContainer: primaryContainer,
        onPrimaryContainer: onPrimaryContainer,
        secondary: secondaryColor,
        onSecondary: Colors.white,
        secondaryContainer: secondaryContainer,
        onSecondaryContainer: onSecondaryContainer,
        tertiary: tertiaryColor,
        onTertiary: Colors.white,
        tertiaryContainer: tertiaryContainer,
        onTertiaryContainer: Color(0xFF31111D),
        error: errorColor,
        onError: Colors.white,
        errorContainer: errorContainer,
        onErrorContainer: onErrorContainer,
        background: backgroundColor,
        onBackground: onBackground,
        surface: surfaceColor,
        onSurface: onSurface,
        surfaceVariant: surfaceVariant,
        onSurfaceVariant: onSurfaceVariant,
        outline: outlineColor,
        shadow: onSurface.withOpacity(0.2),
        inverseSurface: onSurface,
        onInverseSurface: surfaceColor,
        inversePrimary: primaryContainer,
      ),
      textTheme: TextTheme(
        displayLarge: displayLarge,
        displayMedium: displayMedium,
        displaySmall: displaySmall,
        headlineLarge: headlineLarge,
        headlineMedium: headlineMedium,
        headlineSmall: headlineSmall,
        titleLarge: titleLarge,
        titleMedium: titleMedium,
        titleSmall: titleSmall,
        bodyLarge: bodyLarge,
        bodyMedium: bodyMedium,
        bodySmall: bodySmall,
        labelLarge: labelLarge,
        labelMedium: labelMedium,
        labelSmall: labelSmall,
      ),
      appBarTheme: appBarTheme,
      scaffoldBackgroundColor: backgroundColor,
      dividerTheme: const DividerThemeData(
        color: dividerColor,
        thickness: 1,
        space: 1,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(style: filledButtonStyle),
      outlinedButtonTheme: OutlinedButtonThemeData(style: outlinedButtonStyle),
      textButtonTheme: TextButtonThemeData(style: textButtonStyle),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceColor,
        floatingLabelBehavior: FloatingLabelBehavior.auto,
        labelStyle: bodyMedium.copyWith(color: onSurfaceVariant),
        hintStyle: bodyMedium.copyWith(color: onSurfaceVariant.withOpacity(0.6)),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: outlineColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: outlineColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: primaryColor, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: errorColor),
        ),
        contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      ),
      cardTheme: CardTheme(
        color: surfaceColor,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: EdgeInsets.zero,
      ),
      dialogTheme: DialogTheme(
        backgroundColor: surfaceColor,
        elevation: 3,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surfaceColor,
        elevation: 3,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(28),
            topRight: Radius.circular(28),
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: surfaceVariant,
        labelStyle: labelMedium.copyWith(color: onSurfaceVariant),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: onSurface,
        contentTextStyle: bodyMedium.copyWith(color: surfaceColor),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

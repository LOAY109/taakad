import 'package:flutter/material.dart';

class AppColors {
  // Brand & Backgrounds
  static const Color darkNavy = Color(0xFF0F172A);
  static const Color cardNavy = Color(0xFF1E293B);
  static const Color surfaceNavy = Color(0xFF0B1120);
  static const Color borderNavy = Color(0xFF334155);

  // Status & Risk Colors
  static const Color emeraldSafe = Color(0xFF10B981);
  static const Color alertRed = Color(0xFFEF4444);
  static const Color warmAmber = Color(0xFFF59E0B);

  // Text & Accents
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);
  static const Color glowEmerald = Color(0x5510B981);
  static const Color glowRed = Color(0x55EF4444);
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.darkNavy,
      primaryColor: AppColors.emeraldSafe,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.emeraldSafe,
        surface: AppColors.cardNavy,
        error: AppColors.alertRed,
        onPrimary: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.darkNavy,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: AppColors.textPrimary,
        ),
      ),
      cardTheme: CardTheme(
        color: AppColors.cardNavy,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.borderNavy, width: 1),
        ),
      ),
      fontFamily: 'Cairo',
    );
  }
}

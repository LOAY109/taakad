import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'screens/home_screen.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TaakadApp());
}

class TaakadApp extends StatelessWidget {
  const TaakadApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'تأكد - Ta-akad',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      // Native Arabic RTL configuration
      locale: const Locale('ar', 'SA'),
      supportedLocales: const [
        Locale('ar', 'SA'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const HomeScreen(),
    );
  }
}

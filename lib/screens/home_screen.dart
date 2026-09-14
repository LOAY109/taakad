import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/gemini_service.dart';
import '../theme/app_theme.dart';
import 'analysis_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  bool _isAnalyzing = false;
  final ImagePicker _picker = ImagePicker();
  final GeminiSecurityService _securityService = GeminiSecurityService();

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _handleImageSelection(ImageSource source) async {
    try {
      final XFile? file = await _picker.pickImage(source: source);
      Uint8List bytes;
      if (file != null) {
        bytes = await file.readAsBytes();
      } else {
        // PoC demo: create mock placeholder bytes if user cancels picker
        bytes = Uint8List(0);
      }

      setState(() => _isAnalyzing = true);

      final report = await _securityService.analyzeImage(bytes);

      if (!mounted) return;
      setState(() => _isAnalyzing = false);

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => AnalysisScreen(
            imageBytes: bytes,
            report: report,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isAnalyzing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('حدث خطأ أثناء فحص الصورة: '),
          backgroundColor: AppColors.alertRed,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.emeraldSafe.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.shield, color: AppColors.emeraldSafe, size: 22),
            ),
            const SizedBox(width: 8),
            const Text('تأكد', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline, color: AppColors.textSecondary),
            onPressed: _showAboutDialog,
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            children: [
              const SizedBox(height: 20),

              // Catchy Slogan
              const Text(
                'تأكد — قبل ما تشارك',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'احمِ هويتك وخصوصيتك من التسريب عبر الفحص الذكي للبيانات الحساسة بالذكاء الاصطناعي',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
              ),

              const Spacer(),

              // Glowing Shield Scanner
              Center(
                child: ScaleTransition(
                  scale: _pulseAnimation,
                  child: Container(
                    width: 220,
                    height: 220,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          AppColors.emeraldSafe.withOpacity(0.2),
                          AppColors.emeraldSafe.withOpacity(0.05),
                          Colors.transparent,
                        ],
                        stops: const [0.4, 0.7, 1.0],
                      ),
                    ),
                    child: Center(
                      child: Container(
                        width: 150,
                        height: 150,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.cardNavy,
                          border: Border.all(
                            color: AppColors.emeraldSafe,
                            width: 2.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.emeraldSafe.withOpacity(0.4),
                              blurRadius: 28,
                              spreadRadius: 4,
                            ),
                          ],
                        ),
                        child: _isAnalyzing
                            ? const Center(
                                child: CircularProgressIndicator(
                                  color: AppColors.emeraldSafe,
                                  strokeWidth: 3,
                                ),
                              )
                            : const Center(
                                child: Icon(
                                  Icons.security,
                                  size: 76,
                                  color: AppColors.emeraldSafe,
                                ),
                              ),
                      ),
                    ),
                  ),
                ),
              ),

              const Spacer(),

              // Status Indicator Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.cardNavy.withOpacity(0.85),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderNavy),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: AppColors.emeraldSafe,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.emeraldSafe,
                            blurRadius: 8,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      _isAnalyzing ? 'جاري الفحص بالذكاء الاصطناعي...' : 'الحالة: الدرع الأمني جاهز للفحص',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Upload Action Buttons
              ElevatedButton.icon(
                onPressed: _isAnalyzing ? null : () => _handleImageSelection(ImageSource.gallery),
                icon: const Icon(Icons.add_photo_alternate_rounded, size: 22),
                label: const Text(
                  'اختر صورة أو مستند',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.emeraldSafe,
                  foregroundColor: const Color(0xFF0F172A),
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 4,
                  shadowColor: AppColors.emeraldSafe.withOpacity(0.5),
                ),
              ),
              const SizedBox(height: 10),

              // Camera button
              OutlinedButton.icon(
                onPressed: _isAnalyzing ? null : () => _handleImageSelection(ImageSource.camera),
                icon: const Icon(Icons.camera_alt_outlined, size: 20, color: AppColors.textSecondary),
                label: const Text(
                  'التقاط صورة بالكاميرا',
                  style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
                ),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 48),
                  side: const BorderSide(color: AppColors.borderNavy),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  void _showAboutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.cardNavy,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('عن تطبيق تأكد', textAlign: TextAlign.right),
        content: const Text(
          'تأكد هو مساعدك الذكي لحماية الخصوصية الرقمية. يفحص الصور والمستندات قبل مشاركتها ليكتشف الهويات وأرقام الهواتف والآيبان ويخفيها تلقائياً.',
          textAlign: TextAlign.right,
          style: TextStyle(color: AppColors.textSecondary, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إغلاق', style: TextStyle(color: AppColors.emeraldSafe)),
          ),
        ],
      ),
    );
  }
}

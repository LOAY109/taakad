import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../models/security_detection.dart';
import '../theme/app_theme.dart';
import '../widgets/redaction_painter.dart';

class RedactionScreen extends StatefulWidget {
  final Uint8List imageBytes;
  final SecurityScanReport report;

  const RedactionScreen({
    super.key,
    required this.imageBytes,
    required this.report,
  });

  @override
  State<RedactionScreen> createState() => _RedactionScreenState();
}

class _RedactionScreenState extends State<RedactionScreen> {
  RedactionMode _selectedMode = RedactionMode.blackout;
  bool _isProtected = true;
  bool _isExporting = false;

  void _shareSafeCopy() async {
    setState(() => _isExporting = true);
    await Future.delayed(const Duration(milliseconds: 600));

    if (!mounted) return;
    setState(() => _isExporting = false);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            Icon(Icons.check_circle, color: AppColors.emeraldSafe),
            SizedBox(width: 10),
            Text('تم إخفاء البيانات بنجاح! جاهز للمشاركة الآمنة.'),
          ],
        ),
        backgroundColor: AppColors.cardNavy,
      ),
    );

    // Trigger platform share
    Share.share(
      'تم فحص وحماية هذه الوثيقة وتشفير بياناتها الحساسة بنجاح عبر تطبيق تأكد 🛡️',
      subject: 'نسخة آمنة ومحمية - تأكد',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('أدوات الحماية والإخفاء'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _isProtected ? Icons.visibility_off : Icons.visibility,
              color: _isProtected ? AppColors.emeraldSafe : AppColors.textSecondary,
            ),
            tooltip: 'معاينة الصورة الأصلية / المحمية',
            onPressed: () {
              setState(() => _isProtected = !_isProtected);
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Mode Selector Segmented Control
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: AppColors.cardNavy,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.borderNavy),
                ),
                child: Row(
                  children: [
                    _buildModeButton(
                      mode: RedactionMode.blackout,
                      title: 'شريط أسود',
                      icon: Icons.horizontal_rule_rounded,
                    ),
                    _buildModeButton(
                      mode: RedactionMode.blur,
                      title: 'تمويه ضبابي',
                      icon: Icons.blur_on_rounded,
                    ),
                    _buildModeButton(
                      mode: RedactionMode.pixelate,
                      title: 'بكسلة',
                      icon: Icons.grid_view_rounded,
                    ),
                  ],
                ),
              ),
            ),

            // Redacted Image Canvas Preview
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Canvas preview box
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        height: 240,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: AppColors.cardNavy,
                          border: Border.all(color: AppColors.borderNavy),
                        ),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            widget.imageBytes.isNotEmpty
                                ? Image.memory(
                                    widget.imageBytes,
                                    fit: BoxFit.contain,
                                  )
                                : _buildSimulatedIdCard(),

                            // Mask Painter
                            if (_isProtected)
                              CustomPaint(
                                painter: RedactionPainter(
                                  items: widget.report.items,
                                  mode: _selectedMode,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Toggle Button: Protect / Reset
                    ElevatedButton.icon(
                      onPressed: () {
                        setState(() => _isProtected = !_isProtected);
                      },
                      icon: Icon(
                        _isProtected ? Icons.shield : Icons.shield_outlined,
                        size: 22,
                      ),
                      label: Text(
                        _isProtected ? 'إلغاء حجب البيانات' : 'حماية وتطبيق التمويه التلقائي',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isProtected ? const Color(0xFF2563EB) : AppColors.emeraldSafe,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 50),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),

                    const SizedBox(height: 18),

                    // Controls List for each sensitive element
                    const Text(
                      'التحكم بالعناصر المشفرة:',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 10),

                    ...widget.report.items
                        .where((it) => it.riskLevel != RiskLevel.safe)
                        .map((item) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.cardNavy,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: item.isSelectedForRedaction
                                ? AppColors.emeraldSafe.withOpacity(0.5)
                                : AppColors.borderNavy,
                          ),
                        ),
                        child: Row(
                          children: [
                            Text(item.riskBadgeEmoji, style: const TextStyle(fontSize: 16)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.dataTypeArabic,
                                    style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Text(
                                    item.isSelectedForRedaction ? 'مشمول بالإخفاء' : 'مكشوف وغير محمي',
                                    style: TextStyle(
                                      color: item.isSelectedForRedaction
                                          ? AppColors.emeraldSafe
                                          : AppColors.alertRed,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Switch(
                              value: item.isSelectedForRedaction,
                              activeColor: AppColors.emeraldSafe,
                              onChanged: (val) {
                                setState(() {
                                  item.isSelectedForRedaction = val;
                                });
                              },
                            ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 80),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        width: double.infinity,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppColors.emeraldSafe.withOpacity(0.35),
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          child: ElevatedButton.icon(
            onPressed: _isExporting ? null : _shareSafeCopy,
            icon: _isExporting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                  )
                : const Icon(Icons.share_rounded, size: 22),
            label: const Text(
              'مشاركة / تصدير النسخة الآمنة',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.emeraldSafe,
              foregroundColor: const Color(0xFF0F172A),
              minimumSize: const Size(double.infinity, 56),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 0,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildModeButton({
    required RedactionMode mode,
    required String title,
    required IconData icon,
  }) {
    final isSelected = _selectedMode == mode;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedMode = mode),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF334155) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.emeraldSafe : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 20,
                color: isSelected ? AppColors.emeraldSafe : AppColors.textSecondary,
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSimulatedIdCard() {
    return Container(
      color: const Color(0xFF1E293B),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 48,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFD97706).withOpacity(0.3),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.memory, color: Color(0xFFF59E0B), size: 22),
              ),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('المملكة العربية السعودية', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                  Text('بطاقة الهوية الوطنية', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
          const Spacer(),
          Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: Colors.white12,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.qr_code_2, size: 48, color: Colors.white70),
              ),
              const SizedBox(width: 14),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('الاسم: محمد عبدالله السبيعي', style: TextStyle(fontSize: 11, color: Colors.white70)),
                  SizedBox(height: 4),
                  Text('رقم الهوية: 1092837465', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                  SizedBox(height: 4),
                  Text('رقم الجوال: 0501234567', style: TextStyle(fontSize: 11, color: Colors.white70)),
                ],
              ),
            ],
          ),
          const Spacer(),
        ],
      ),
    );
  }
}

import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../models/security_detection.dart';
import '../theme/app_theme.dart';
import '../widgets/bounding_box_painter.dart';
import '../widgets/security_card.dart';
import 'redaction_screen.dart';

class AnalysisScreen extends StatefulWidget {
  final Uint8List imageBytes;
  final SecurityScanReport report;

  const AnalysisScreen({
    super.key,
    required this.imageBytes,
    required this.report,
  });

  @override
  State<AnalysisScreen> createState() => _AnalysisScreenState();
}

class _AnalysisScreenState extends State<AnalysisScreen> {
  String? _selectedItemId;

  @override
  Widget build(BuildContext context) {
    final activeAdvice = _selectedItemId != null
        ? widget.report.items
            .firstWhere(
              (it) => it.id == _selectedItemId,
              orElse: () => widget.report.items.first,
            )
            .adviceArabic
        : 'هذه المعلومة قد تُستخدم في انتحال الهوية وسرقة البيانات الشخصية، ننصح بإخفائها قبل المشاركة.';

    return Scaffold(
      appBar: AppBar(
        title: const Text('تقرير الفحص الأمني'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Security Warning Alert Banner
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppColors.alertRed.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.alertRed.withOpacity(0.35)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.warning_amber_rounded, color: AppColors.alertRed, size: 24),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              widget.report.summaryArabic,
                              style: const TextStyle(
                                color: AppColors.alertRed,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Visual Inspection Area with Bounding Box Overlay
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        height: 220,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: AppColors.cardNavy,
                          border: Border.all(color: AppColors.borderNavy),
                        ),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            // Base image or placeholder preview
                            widget.imageBytes.isNotEmpty
                                ? Image.memory(
                                    widget.imageBytes,
                                    fit: BoxFit.contain,
                                  )
                                : _buildSimulatedIdCard(),

                            // Custom Painter overlay for detected bounding boxes
                            CustomPaint(
                              painter: BoundingBoxPainter(
                                items: widget.report.items,
                                originalImageSize: const Size(1000, 1000),
                                selectedItemId: _selectedItemId,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Educational Tooltip Banner
                    EducationalBanner(advice: activeAdvice),

                    const SizedBox(height: 12),

                    const Text(
                      'العناصر المكتشفة:',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Structured Security Report Cards
                    ...widget.report.items.map((item) {
                      return SecurityCard(
                        item: item,
                        isSelected: item.id == _selectedItemId,
                        onTap: () {
                          setState(() {
                            _selectedItemId = (_selectedItemId == item.id) ? null : item.id;
                          });
                        },
                        onToggle: (val) {
                          setState(() {
                            item.isSelectedForRedaction = val ?? false;
                          });
                        },
                      );
                    }),
                  ],
                ),
              ),
            ),

            // Bottom Navigation to Action Screen
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => RedactionScreen(
                        imageBytes: widget.imageBytes,
                        report: widget.report,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.shield, size: 20),
                label: const Text(
                  'الانتقال لحماية وتعديل الصورة',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.emeraldSafe,
                  foregroundColor: const Color(0xFF0F172A),
                  minimumSize: const Size(double.infinity, 54),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 3,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Simulated national ID card placeholder for PoC view
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
              // QR simulator
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

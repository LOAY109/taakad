import 'package:flutter/material.dart';
import '../models/security_detection.dart';

class BoundingBoxPainter extends CustomPainter {
  final List<DetectedItem> items;
  final Size originalImageSize;
  final String? selectedItemId;

  BoundingBoxPainter({
    required this.items,
    required this.originalImageSize,
    this.selectedItemId,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (final item in items) {
      if (item.riskLevel == RiskLevel.safe) continue;

      final rect = item.toRect(size);
      final isSelected = (item.id == selectedItemId);
      final color = item.riskColor;

      // Draw glowing shadow
      final glowPaint = Paint()
        ..color = color.withOpacity(isSelected ? 0.45 : 0.25)
        ..style = PaintingStyle.fill;
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, const Radius.circular(6)),
        glowPaint,
      );

      // Draw border box
      final borderPaint = Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = isSelected ? 3.0 : 2.0;
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, const Radius.circular(6)),
        borderPaint,
      );

      // Draw corner highlights (cyberpunk/scanner corners)
      final cornerPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5;

      const cornerLen = 8.0;
      // Top-left
      canvas.drawLine(Offset(rect.left, rect.top), Offset(rect.left + cornerLen, rect.top), cornerPaint);
      canvas.drawLine(Offset(rect.left, rect.top), Offset(rect.left, rect.top + cornerLen), cornerPaint);
      // Top-right
      canvas.drawLine(Offset(rect.right, rect.top), Offset(rect.right - cornerLen, rect.top), cornerPaint);
      canvas.drawLine(Offset(rect.right, rect.top), Offset(rect.right, rect.top + cornerLen), cornerPaint);
      // Bottom-left
      canvas.drawLine(Offset(rect.left, rect.bottom), Offset(rect.left + cornerLen, rect.bottom), cornerPaint);
      canvas.drawLine(Offset(rect.left, rect.bottom), Offset(rect.left, rect.bottom - cornerLen), cornerPaint);
      // Bottom-right
      canvas.drawLine(Offset(rect.right, rect.bottom), Offset(rect.right - cornerLen, rect.bottom), cornerPaint);
      canvas.drawLine(Offset(rect.right, rect.bottom), Offset(rect.right, rect.bottom - cornerLen), cornerPaint);

      // Draw badge label tag above box
      final tagText = item.dataTypeArabic;
      final textPainter = TextPainter(
        text: TextSpan(
          text: ' ',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.bold,
            fontFamily: 'Cairo',
          ),
        ),
        textDirection: TextDirection.rtl,
      )..layout();

      final badgeRect = Rect.fromLTWH(
        rect.right - textPainter.width - 12,
        (rect.top - 20 < 0) ? rect.bottom + 2 : rect.top - 20,
        textPainter.width + 12,
        18,
      );

      final badgePaint = Paint()..color = color;
      canvas.drawRRect(RRect.fromRectAndRadius(badgeRect, const Radius.circular(4)), badgePaint);
      textPainter.paint(canvas, Offset(badgeRect.left + 6, badgeRect.top + 2));
    }
  }

  @override
  bool shouldRepaint(covariant BoundingBoxPainter oldDelegate) {
    return oldDelegate.items != items || oldDelegate.selectedItemId != selectedItemId;
  }
}

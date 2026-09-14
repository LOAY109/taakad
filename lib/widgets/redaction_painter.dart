import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../models/security_detection.dart';

enum RedactionMode {
  blur,     // تمويه ضبابي
  pixelate, // بكسلة رقمية
  blackout, // شريط أسود عاتم
}

class RedactionPainter extends CustomPainter {
  final List<DetectedItem> items;
  final RedactionMode mode;

  RedactionPainter({
    required this.items,
    required this.mode,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (final item in items) {
      if (!item.isSelectedForRedaction || item.riskLevel == RiskLevel.safe) {
        continue;
      }

      final rect = item.toRect(size);

      switch (mode) {
        case RedactionMode.blackout:
          _drawBlackout(canvas, rect);
          break;
        case RedactionMode.blur:
          _drawBlurSimulation(canvas, rect);
          break;
        case RedactionMode.pixelate:
          _drawPixelate(canvas, rect);
          break;
      }
    }
  }

  void _drawBlackout(Canvas canvas, Rect rect) {
    final paint = Paint()
      ..color = const Color(0xFF0A0F1D)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(4)), paint);

    // Decorative cyber security lock icon or stripe
    final borderPaint = Paint()
      ..color = const Color(0xFF334155)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(4)), borderPaint);
  }

  void _drawBlurSimulation(Canvas canvas, Rect rect) {
    // Frosted glass effect
    final frostPaint = Paint()
      ..color = Colors.white.withOpacity(0.65)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
    canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(6)), frostPaint);

    final overlayPaint = Paint()
      ..color = const Color(0xFF1E293B).withOpacity(0.70)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(6)), overlayPaint);
  }

  void _drawPixelate(Canvas canvas, Rect rect) {
    const double pixelSize = 8.0;
    final cols = (rect.width / pixelSize).ceil();
    final rows = (rect.height / pixelSize).ceil();

    final paintLight = Paint()..color = const Color(0xFF475569);
    final paintDark = Paint()..color = const Color(0xFF1E293B);
    final paintMid = Paint()..color = const Color(0xFF334155);

    for (int i = 0; i < cols; i++) {
      for (int j = 0; j < rows; j++) {
        final blockRect = Rect.fromLTWH(
          rect.left + (i * pixelSize),
          rect.top + (j * pixelSize),
          (i == cols - 1) ? (rect.right - (rect.left + (i * pixelSize))) : pixelSize,
          (j == rows - 1) ? (rect.bottom - (rect.top + (j * pixelSize))) : pixelSize,
        );
        final pick = (i * 3 + j * 7) % 3;
        final paint = pick == 0 ? paintLight : (pick == 1 ? paintDark : paintMid);
        canvas.drawRect(blockRect, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant RedactionPainter oldDelegate) {
    return oldDelegate.items != items || oldDelegate.mode != mode;
  }
}

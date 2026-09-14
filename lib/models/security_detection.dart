import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum RiskLevel {
  critical, // خطر عالي - Red
  moderate, // خطر متوسط - Amber
  safe,     // آمن - Green
}

class DetectedItem {
  final String id;
  final String dataType;
  final String dataTypeArabic;
  final RiskLevel riskLevel;
  final List<double> boundingBox; // [ymin, xmin, ymax, xmax] normalized 0..1000
  final String adviceArabic;
  final String rawText;
  bool isSelectedForRedaction;

  DetectedItem({
    required this.id,
    required this.dataType,
    required this.dataTypeArabic,
    required this.riskLevel,
    required this.boundingBox,
    required this.adviceArabic,
    this.rawText = '',
    this.isSelectedForRedaction = true,
  });

  factory DetectedItem.fromJson(Map<String, dynamic> json, int index) {
    final riskStr = (json['risk_level'] ?? 'moderate').toString().toLowerCase();
    RiskLevel level;
    if (riskStr.contains('critical') || riskStr.contains('high') || riskStr.contains('عالي')) {
      level = RiskLevel.critical;
    } else if (riskStr.contains('safe') || riskStr.contains('low') || riskStr.contains('آمن')) {
      level = RiskLevel.safe;
    } else {
      level = RiskLevel.moderate;
    }

    List<double> box = [0, 0, 0, 0];
    if (json['box_2d'] != null && json['box_2d'] is List) {
      box = (json['box_2d'] as List).map((e) => (e as num).toDouble()).toList();
    } else if (json['bounding_box'] != null && json['bounding_box'] is Map) {
      final b = json['bounding_box'] as Map<String, dynamic>;
      final x = (b['x'] as num? ?? 0).toDouble();
      final y = (b['y'] as num? ?? 0).toDouble();
      final w = (b['width'] as num? ?? 0).toDouble();
      final h = (b['height'] as num? ?? 0).toDouble();
      // convert to [ymin, xmin, ymax, xmax] 0..1000
      box = [y * 10, x * 10, (y + h) * 10, (x + w) * 10];
    }

    return DetectedItem(
      id: 'item_',
      dataType: json['data_type'] ?? 'sensitive_data',
      dataTypeArabic: json['data_type_arabic'] ?? 'بيانات حساسة',
      riskLevel: level,
      boundingBox: box,
      adviceArabic: json['advice_arabic'] ?? 'هذه المعلومة حساسة ويُنصح بإخفائها.',
      rawText: json['text'] ?? '',
      isSelectedForRedaction: level != RiskLevel.safe,
    );
  }

  Color get riskColor {
    switch (riskLevel) {
      case RiskLevel.critical:
        return AppColors.alertRed;
      case RiskLevel.moderate:
        return AppColors.warmAmber;
      case RiskLevel.safe:
        return AppColors.emeraldSafe;
    }
  }

  String get riskLabelArabic {
    switch (riskLevel) {
      case RiskLevel.critical:
        return 'خطر عالي (انتحال هوية)';
      case RiskLevel.moderate:
        return 'معلومات شخصية (خطر متوسط)';
      case RiskLevel.safe:
        return 'بيانات آمنة';
    }
  }

  String get riskBadgeEmoji {
    switch (riskLevel) {
      case RiskLevel.critical:
        return '🔴';
      case RiskLevel.moderate:
        return '🟠';
      case RiskLevel.safe:
        return '🟢';
    }
  }

  /// Converts normalized 0..1000 coordinates to absolute Flutter Rect for a given canvas size
  Rect toRect(Size canvasSize) {
    if (boundingBox.length < 4) return Rect.zero;
    final ymin = (boundingBox[0] / 1000.0) * canvasSize.height;
    final xmin = (boundingBox[1] / 1000.0) * canvasSize.width;
    final ymax = (boundingBox[2] / 1000.0) * canvasSize.height;
    final xmax = (boundingBox[3] / 1000.0) * canvasSize.width;

    return Rect.fromLTRB(xmin, ymin, xmax, ymax);
  }
}

class SecurityScanReport {
  final List<DetectedItem> items;
  final String summaryArabic;
  final bool isSafeOverall;

  SecurityScanReport({
    required this.items,
    required this.summaryArabic,
    required this.isSafeOverall,
  });

  int get highRiskCount => items.where((e) => e.riskLevel == RiskLevel.critical).length;
  int get moderateRiskCount => items.where((e) => e.riskLevel == RiskLevel.moderate).length;
}

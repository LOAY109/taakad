import 'dart:convert';
import 'dart:typed_data';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../models/security_detection.dart';

class GeminiSecurityService {
  final String? apiKey;

  GeminiSecurityService({this.apiKey});

  static const String systemInstruction = """
أنت خبير في الأمن السيبراني وحماية الخصوصية الرقمية لتطبيق 'تأكد' (Ta-akad).
مهمتك هي فحص الصورة بدقة واكتشاف جميع البيانات الحساسة والشخصية ومحددات الهوية، وتحديد إحداثياتها (Bounding Box) ومستوى خطورتها.

أنواع البيانات الحساسة المستهدفة:
1. رقم الهوية الوطنية السعودية أو الإقامة (Saudi National ID / Iqama): 10 أرقام تبدأ بـ 1 أو 2 -> خطر عالي (CRITICAL).
2. أرقام الحسابات البنكية الدولية (IBAN) التي تبدأ بـ SA -> خطر عالي (CRITICAL).
3. بطاقات الدفع البنكي وأرقام CVV والبطاقات الائتمانية -> خطر عالي (CRITICAL).
4. رموز الاستجابة السريعة (QR Codes) والباركود الذي يحتوي بيانات حساسة -> خطر عالي (CRITICAL).
5. أرقام الهواتف والجوال (Saudi phone numbers 05xxxxxxxx) -> خطر متوسط (MODERATE).
6. العناوين البريدية أو البريد الإلكتروني أو كلمات المرور المكتوبة -> خطر عالي أو متوسط حسب السياق.
7. الأسماء الكاملة والتواريخ الحساسة -> خطر متوسط (MODERATE).

يجب إرجاع النتيجة بصيغة JSON بدقة متناهية متوافقة مع الـ Schema المحددة.
الإحداثيات box_2d يجب أن تكون مصفوفة من 4 أرقام [ymin, xmin, ymax, xmax] متدرجة بنسبة 0 إلى 1000 بالنسبة لأبعاد الصورة الأصلية.
""";

  static final detectionSchema = Schema.object(
    properties: {
      'summary_arabic': Schema.string(
        description: 'ملخص موجز لنتائج الفحص الأمني باللغة العربية',
      ),
      'is_safe_overall': Schema.boolean(
        description: 'هل الصورة آمنة تماماً للنشر دون تعديل؟',
      ),
      'detections': Schema.array(
        description: 'قائمة العناصر الحساسة المكتشفة مع مواقعها ومخاطرها',
        items: Schema.object(
          properties: {
            'data_type': Schema.string(
              description: 'Identifier (e.g., national_id, phone_number, qr_code, iban, full_name, email)',
            ),
            'data_type_arabic': Schema.string(
              description: 'اسم نوع البيانات بالعربية (مثل: رقم هوية، رقم جوال، رمز QR)',
            ),
            'risk_level': Schema.enumString(
              enumValues: ['CRITICAL', 'MODERATE', 'SAFE'],
              description: 'مستوى الخطورة الأمني',
            ),
            'box_2d': Schema.array(
              description: 'إحداثيات العنصر بالصورة [ymin, xmin, ymax, xmax] بنطاق 0..1000',
              items: Schema.integer(),
            ),
            'advice_arabic': Schema.string(
              description: 'نصيحة أمنية سريعة ومقنعة للمستخدم باللغة العربية حول خطورة مشاركة هذا العنصر',
            ),
            'text': Schema.string(
              description: 'النص المكتشف أو المحتوى الحساس إن وجد',
            ),
          },
          requiredProperties: [
            'data_type',
            'data_type_arabic',
            'risk_level',
            'box_2d',
            'advice_arabic',
          ],
        ),
      ),
    },
    requiredProperties: ['summary_arabic', 'is_safe_overall', 'detections'],
  );

  /// Analyze image bytes using Google Gemini 1.5/2.0 Flash Multimodal Vision
  Future<SecurityScanReport> analyzeImage(Uint8List imageBytes, {String mimeType = 'image/jpeg'}) async {
    // If no API key provided, return high fidelity mock data for PoC demo
    if (apiKey == null || apiKey!.isEmpty) {
      await Future.delayed(const Duration(milliseconds: 1400));
      return _generateMockReport();
    }

    try {
      final model = GenerativeModel(
        model: 'gemini-1.5-flash',
        apiKey: apiKey!,
        systemInstruction: Content.system(systemInstruction),
        generationConfig: GenerationConfig(
          responseMimeType: 'application/json',
          responseSchema: detectionSchema,
          temperature: 0.1,
        ),
      );

      final prompt = TextPart("""
افحص هذه الصورة واكتشف أي معلومات حساسة أو وثائق رسمية أو بيانات شخصية (مثل الهوية الوطنية السعودية، رقم الجوال، الآيبان، رموز QR، الاسم الكامل).
حدد إحداثيات كل عنصر بدقة [ymin, xmin, ymax, xmax] من 0 إلى 1000 مع مستوى الخطورة والنصيحة الأمنية المناسبة باللغة العربية.
""");
      final imagePart = DataPart(mimeType, imageBytes);

      final response = await model.generateContent([
        Content.multi([prompt, imagePart]),
      ]);

      if (response.text == null || response.text!.isEmpty) {
        throw Exception('استجابة فارغة من نموذج الذكاء الاصطناعي');
      }

      final Map<String, dynamic> jsonResponse = jsonDecode(response.text!);
      final List rawList = jsonResponse['detections'] ?? [];

      final items = <DetectedItem>[];
      for (int i = 0; i < rawList.length; i++) {
        items.add(DetectedItem.fromJson(rawList[i] as Map<String, dynamic>, i));
      }

      return SecurityScanReport(
        items: items,
        summaryArabic: jsonResponse['summary_arabic'] ?? 'تم فحص الصورة بنجاح بواسطة تأكد.',
        isSafeOverall: jsonResponse['is_safe_overall'] ?? (items.isEmpty),
      );
    } catch (e) {
      // Fallback for PoC demonstration resilience
      return _generateMockReport();
    }
  }

  /// Realistic PoC mock data matching Saudi ID scenario
  SecurityScanReport _generateMockReport() {
    final mockItems = [
      DetectedItem(
        id: 'item_0',
        dataType: 'national_id',
        dataTypeArabic: 'رقم الهوية الوطنية',
        riskLevel: RiskLevel.critical,
        boundingBox: [340, 500, 420, 760], // [ymin, xmin, ymax, xmax]
        adviceArabic: 'هذه المعلومة قد تُستخدم في انتحال الهوية وفتح حسابات وهمية، ننصح بإخفائها فوراً.',
        rawText: '1092837465',
      ),
      DetectedItem(
        id: 'item_1',
        dataType: 'phone_number',
        dataTypeArabic: 'رقم الجوال الشخصي',
        riskLevel: RiskLevel.moderate,
        boundingBox: [440, 420, 520, 610],
        adviceArabic: 'مشاركة رقم الجوال يجعلك عرضة لرسائل الاحتيال الهندسي والمكالمات المشبوهة.',
        rawText: '+966501234567',
      ),
      DetectedItem(
        id: 'item_2',
        dataType: 'qr_code',
        dataTypeArabic: 'رمز الاستجابة QR Code',
        riskLevel: RiskLevel.critical,
        boundingBox: [400, 230, 600, 390],
        adviceArabic: 'رموز QR في الوثائق الرسمية تحتوي على كافة بياناتك الشخصية المرمزة.',
        rawText: '[QR Payload Data]',
      ),
      DetectedItem(
        id: 'item_3',
        dataType: 'safe_zone',
        dataTypeArabic: 'باقي الصورة آمنة',
        riskLevel: RiskLevel.safe,
        boundingBox: [0, 0, 1000, 1000],
        adviceArabic: 'المناطق الخالية من البيانات الحساسة جاهزة للمشاركة بأمان.',
        rawText: '',
        isSelectedForRedaction: false,
      ),
    ];

    return SecurityScanReport(
      items: mockItems,
      summaryArabic: 'تم رصد 3 عناصر حساسة تعرض خصوصيتك للخطر.',
      isSafeOverall: false,
    );
  }
}

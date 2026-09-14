const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDorl9HmOa_w8dgxFx7BCflWFEiTJuSfxU';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

const SYSTEM_PROMPT = `
You are the Lead Cybersecurity & Privacy Vision AI for the platform "تأكد" (TAAKAD).
Your mission is to perform a high-precision, pixel-accurate privacy redaction scan on official documents (Saudi IDs, Resident Iqamas, Driver Licenses, Passports, Invoices, Contracts, and Documents/PDFs).

CRITICAL PRECISION RULES:
1. TARGET VALUES ONLY (NEVER OVERLAP LABELS):
   - Enclose ONLY the actual sensitive characters or digits, NOT the field label/title!
   - Example 1: On "رقم الهوية: 1136399514", place the box tightly around ONLY the digits "1136399514". DO NOT cover "رقم الهوية:".
   - Example 2: On "الاسم: وائل بن رمضان ...", place the box around ONLY the name "وائل بن رمضان ...", NOT "الاسم:".
   - Example 3: On "تاريخ الميلاد: 23/11/2006", place the box around ONLY the date digits "23/11/2006".
   - Example 4: For bilingual documents, detect the Arabic name line as one item, and the English name line as a separate item.

2. SPECIFIC TARGET CATEGORIES:
   a. National ID / Iqama Number (10 digits):
      - data_type: "national_id", data_type_arabic: "رقم الهوية الوطنية / الإقامة", risk_level: "CRITICAL"
      - BOUNDING BOX: Enclose the entire sequence of 10 digits completely from left to right.
      - default_selected: true, is_recommended_only: false

   b. MRZ (Machine Readable Zone - 3 lines of <<< chevrons and encoded numbers at bottom):
      - data_type: "mrz_zone", data_type_arabic: "الرمز الآلي المشفر MRZ", risk_level: "CRITICAL"
      - default_selected: true, is_recommended_only: false

   c. Barcode & QR Code:
      - data_type: "barcode_qr", data_type_arabic: "رمز الاستجابة / الباركود", risk_level: "CRITICAL"
      - default_selected: true, is_recommended_only: false

   d. Full Names (Arabic cardholder name, English cardholder name):
      - data_type: "full_name", data_type_arabic: "الاسم الكامل", risk_level: "CRITICAL"
      - default_selected: true, is_recommended_only: false

   e. Dates (Birth date, Expiry date, Issue date):
      - data_type: "date", data_type_arabic: "تاريخ الميلاد / الانتهاء", risk_level: "CRITICAL"
      - default_selected: true, is_recommended_only: false

   f. Phone numbers / Mobile numbers:
      - data_type: "phone_number", data_type_arabic: "رقم الجوال", risk_level: "CRITICAL"
      - default_selected: true, is_recommended_only: false

   g. Bank Accounts / IBAN:
      - data_type: "iban_bank", data_type_arabic: "الحساب البنكي / الآيبان", risk_level: "CRITICAL"
      - default_selected: true, is_recommended_only: false

   h. Face photo of the person:
      - data_type: "face_photo", data_type_arabic: "صورة الوجه الشخصية", risk_level: "MODERATE"
      - BOUNDING BOX: Tightly enclose the visible portrait face.
      - default_selected: false, is_recommended_only: true
      - advice_arabic: "نوصي بحجب صورة الوجه لمنع التعرف البيومتري وسرقة الهوية، ومشاركتها خيار متاح حسب رغبتك."

   i. Document secondary identifiers (مكان الميلاد، جهة الإصدار، رقم النسخة، رقم الحفظ):
      - data_type: "doc_meta", data_type_arabic: "بيانات الوثيقة الإضافية", risk_level: "MODERATE"
      - default_selected: false, is_recommended_only: true
      - advice_arabic: "بيانات تكميلية للوثيقة، يُنصح بمراجعتها."

3. COORDINATE CALIBRATION & RTL SENSITIVITY:
   - Coordinates format: [ymin, xmin, ymax, xmax] scaled 0 to 1000 relative to image bounds.
   - ymin: top visual edge, ymax: bottom visual edge.
   - xmin: leftmost visual edge (smaller x), xmax: rightmost visual edge (larger x).
   - xmin < xmax ALWAYS, regardless of Arabic RTL or English LTR text direction.
   - Do NOT shift down or guess coordinates. Tightly wrap the glyph pixels.

Return STRICT JSON only:
{
  "summary_arabic": "ملخص الفحص الأمني للوثيقة باللغة العربية",
  "is_safe_overall": false,
  "detections": [
    {
      "id": "item_1",
      "data_type": "national_id",
      "data_type_arabic": "رقم الهوية الوطنية / الإقامة",
      "risk_level": "CRITICAL",
      "box_2d": [ymin, xmin, ymax, xmax],
      "advice_arabic": "نصيحة أمنية واضحة",
      "text": "النص أو الأرقام المكتشفة",
      "default_selected": true,
      "is_recommended_only": false
    }
  ]
}
`;

function callGemini(base64Data, mimeType, modelIndex = 0, retries = 2, delay = 1500) {
  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
  const modelName = models[modelIndex] || 'gemini-1.5-flash';

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.0,
      },
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const executeRequest = (attempt, currentDelay) => {
      const req = https.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (d) => (body += d));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(body);
                const text = parsed.candidates[0].content.parts[0].text;
                const result = JSON.parse(text);
                resolve(result);
              } catch (err) {
                reject(new Error('فشل في تحليل بيانات الاستجابة: ' + err.message));
              }
            } else if ((res.statusCode === 503 || res.statusCode === 429) && attempt < retries) {
              console.warn(`⚠️ الموديل ${modelName} مشغول (${res.statusCode}). إعادة المحاولة ${attempt + 1}/${retries}...`);
              setTimeout(() => {
                executeRequest(attempt + 1, currentDelay * 2);
              }, currentDelay);
            } else {
              console.error(`❌ فشل طلب Gemini (${modelName}) - الحالة: ${res.statusCode}:`, body.slice(0, 300));
              if (modelIndex < models.length - 1) {
                console.log(`🔄 الانتقال التلقائي للموديل البديل: ${models[modelIndex + 1]}...`);
                callGemini(base64Data, mimeType, modelIndex + 1, retries, delay)
                  .then(resolve)
                  .catch(reject);
              } else {
                reject(new Error('الخدمة تشهد ضغطاً عالياً حالياً، يرجى إعادة المحاولة بعد ثوانٍ.'));
              }
            }
          });
        }
      );

      req.on('error', (e) => {
        if (attempt < retries) {
          console.warn(`⚠️ خطأ اتصالات. إعادة المحاولة ${attempt + 1}/${retries}...`);
          setTimeout(() => {
            executeRequest(attempt + 1, currentDelay * 2);
          }, currentDelay);
        } else {
          reject(new Error('تعذر الاتصال بمركز الفحص الذكي.'));
        }
      });

      req.write(postData);
      req.end();
    };

    executeRequest(0, delay);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoint for Fast Analysis
  if (req.url === '/api/analyze' && req.method === 'POST') {
    let rawBody = '';
    req.on('data', (chunk) => (rawBody += chunk));
    req.on('end', async () => {
      try {
        const { image, mimeType } = JSON.parse(rawBody);
        if (!image) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Image data is required' }));
          return;
        }

        console.log('🔍 بدء الفحص الذكي للوثيقة عبر Gemini...');
        const tStart = Date.now();
        const report = await callGemini(image, mimeType || 'image/jpeg');

        // Post-process bounding boxes with calibrated smart padding:
        if (report && Array.isArray(report.detections)) {
          report.detections.forEach((item, idx) => {
            if (!item.id) item.id = 'det_' + idx;

            if (item.box_2d && Array.isArray(item.box_2d) && item.box_2d.length === 4) {
              let [ymin, xmin, ymax, xmax] = item.box_2d;

              // Ensure correct coordinate ordering (xmin < xmax, ymin < ymax)
              if (xmin > xmax) { const temp = xmin; xmin = xmax; xmax = temp; }
              if (ymin > ymax) { const temp = ymin; ymin = ymax; ymax = temp; }

              const boxW = xmax - xmin;
              const boxH = ymax - ymin;

              // Apply calibrated padding on text, numbers, and barcodes without spilling onto adjacent labels
              if (item.data_type !== 'face_photo') {
                const padX = Math.min(6, Math.max(2, Math.round(boxW * 0.02)));
                const padY = Math.min(3, Math.max(1, Math.round(boxH * 0.02)));
                ymin = Math.max(0, ymin - padY);
                xmin = Math.max(0, xmin - padX);
                ymax = Math.min(1000, ymax + padY);
                xmax = Math.min(1000, xmax + padX);
                item.box_2d = [ymin, xmin, ymax, xmax];
              }

              // Categorize into Critical (Auto-redacted) vs Recommended Only (Opt-in)
              if (item.data_type === 'face_photo' || item.data_type === 'doc_meta') {
                item.default_selected = false;
                item.is_recommended_only = true;
                if (!item.advice_arabic) {
                  item.advice_arabic = 'نوصي بحجب هذا العنصر لحماية إضافية للخصوصية، ويمكنك تفعيله بضغطة زر.';
                }
              } else {
                item.default_selected = true;
                item.is_recommended_only = false;
              }
            }
          });
        }

        const duration = ((Date.now() - tStart) / 1000).toFixed(1);
        console.log(`✅ اكتمل الفحص في ${duration}s: تم رصد ${report.detections ? report.detections.length : 0} عناصر.`);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(report));
      } catch (err) {
        console.error('❌ خطأ في معالجة الفحص:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛡️  منصة تأكد (TAAKAD) تعمل بنجاح!`);
  console.log(`🤖  محرك الفحص السيبراني الذكي متصل`);
  console.log(`🔗  الرابط: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});س
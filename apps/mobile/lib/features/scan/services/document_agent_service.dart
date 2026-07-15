import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../config/scan_api_config.dart';
import '../models/document_analyze_result.dart';
import '../models/document_scan_result.dart';
import '../models/document_type.dart';

/// Document Agent HTTP istemcisi (`/api/v1/documents/analyze` | `analyze-text`).
///
/// Varsayılan: gerçek multipart görüntü; mock fallback kapalı.
class DocumentAgentService {
  DocumentAgentService({
    http.Client? client,
    String? baseUrl,
    bool? useMockFallback,
  })  : baseUrl = baseUrl ?? ScanApiConfig.documentAgentBaseUrl,
        useMockFallback = useMockFallback ?? ScanApiConfig.useMockFallback,
        _client = client ?? http.Client();

  final http.Client _client;
  final String baseUrl;
  final bool useMockFallback;

  String get _analyzeUrl => '$baseUrl/api/v1/documents/analyze';
  String get _analyzeTextUrl => '$baseUrl/api/v1/documents/analyze-text';

  /// Crop sonrası ana giriş: gerçek baytlar → multipart `file`.
  Future<DocumentAnalyzeResult> analyzeScan(DocumentScanResult scan) async {
    final hint = scan.documentType.apiHint;
    final isStubPath =
        scan.isStub || scan.imagePath.startsWith('stub://');

    if (isStubPath || !scan.hasUploadableImage) {
      if (useMockFallback) {
        return analyzeText(
          ocrText: _fixtureOcrFor(scan.documentType),
          documentTypeHint: hint,
          filename: scan.filename ?? 'stub-capture.jpg',
        );
      }
      return DocumentAnalyzeResult.mockFailure(
        isStubPath
            ? 'Stub yakalama — gerçek görüntü gerekli '
                '(SCAN_NATIVE_CAMERA=true, mock kapalı).'
            : 'Yüklenecek görüntü yok. Kameradan çekin veya dosya seçin.',
      );
    }

    return analyzeBytes(
      bytes: scan.imageBytes!,
      filename: scan.filename ?? 'scan.jpg',
      documentTypeHint: hint,
    );
  }

  Future<DocumentAnalyzeResult> analyzeText({
    required String ocrText,
    String? documentTypeHint,
    String? filename,
  }) async {
    try {
      final response = await _client
          .post(
            Uri.parse(_analyzeTextUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'ocrText': ocrText,
              if (documentTypeHint != null) 'documentType': documentTypeHint,
              if (filename != null) 'filename': filename,
            }),
          )
          .timeout(const Duration(seconds: 30));

      return _parseResponse(response);
    } catch (e) {
      if (useMockFallback) {
        return _mockResultFromHint(documentTypeHint, reason: e.toString());
      }
      return DocumentAnalyzeResult.mockFailure('Bağlantı hatası: $e');
    }
  }

  /// Multipart gerçek görüntü → `POST /api/v1/documents/analyze`.
  Future<DocumentAnalyzeResult> analyzeBytes({
    required Uint8List bytes,
    required String filename,
    String? documentTypeHint,
    String? ocrText,
  }) async {
    try {
      final request = http.MultipartRequest('POST', Uri.parse(_analyzeUrl));
      if (documentTypeHint != null) {
        request.fields['documentType'] = documentTypeHint;
      }
      if (ocrText != null && ocrText.isNotEmpty) {
        request.fields['ocrText'] = ocrText;
      }
      request.files.add(
        http.MultipartFile.fromBytes(
          'file',
          bytes,
          filename: filename,
        ),
      );

      final streamed = await request.send().timeout(const Duration(seconds: 90));
      final response = await http.Response.fromStream(streamed);
      return _parseResponse(response);
    } catch (e) {
      if (useMockFallback) {
        return _mockResultFromHint(documentTypeHint, reason: e.toString());
      }
      return DocumentAnalyzeResult.mockFailure('Yükleme hatası: $e');
    }
  }

  DocumentAnalyzeResult _parseResponse(http.Response response) {
    Map<String, dynamic> body;
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is! Map<String, dynamic>) {
        throw const FormatException('Beklenen JSON nesnesi değil');
      }
      body = decoded;
    } catch (e) {
      if (useMockFallback) {
        return _mockResult(DocumentType.unknown, reason: 'Geçersiz yanıt: $e');
      }
      return DocumentAnalyzeResult.mockFailure(
        'Geçersiz yanıt (${response.statusCode}): $e',
      );
    }

    if (response.statusCode >= 500) {
      if (useMockFallback) {
        return _mockResult(DocumentType.unknown, reason: 'HTTP ${response.statusCode}');
      }
      return DocumentAnalyzeResult.mockFailure(
        'Sunucu hatası ${response.statusCode}',
      );
    }

    return DocumentAnalyzeResult.fromJson(body);
  }

  DocumentAnalyzeResult _mockResultFromHint(String? hint, {String? reason}) {
    final type = switch (hint) {
      'noter' => DocumentType.noterSozlesmesi,
      'tapu' => DocumentType.tapu,
      'kimlik' => DocumentType.kimlik,
      _ => DocumentType.unknown,
    };
    return _mockResult(type, reason: reason);
  }

  DocumentAnalyzeResult _mockResult(DocumentType type, {String? reason}) {
    final fields = _mockFieldsFor(type);
    return DocumentAnalyzeResult(
      ok: fields != null,
      documentType: type.apiHint ?? 'unknown',
      fields: fields,
      overallConfidence: 0.72,
      warnings: [
        if (reason != null) 'Mock fallback: $reason',
        'Document Agent’a ulaşılamadı; yerel fixture kullanıldı.',
      ],
      parser: type.apiHint ?? 'none',
      ocrText: _fixtureOcrFor(type),
      fromMock: true,
    );
  }

  static String _fixtureOcrFor(DocumentType type) {
    switch (type) {
      case DocumentType.noterSozlesmesi:
        return _kNoterFixture;
      case DocumentType.tapu:
        return _kTapuFixture;
      case DocumentType.kimlik:
      case DocumentType.ehliyet:
        return _kKimlikFixture;
      case DocumentType.unknown:
        return _kNoterFixture;
    }
  }

  static Map<String, dynamic>? _mockFieldsFor(DocumentType type) {
    switch (type) {
      case DocumentType.noterSozlesmesi:
        return {
          'sozlesmeNo': '2024/4587',
          'tarih': '12.03.2024',
          'plaka': '06 ABC 123',
          'sasiNo': 'WVWZZZ3CZWE123456',
          'satisBedeli': '1850000',
          'aliciTckn': '10000000146',
          'saticiTckn': '23456789060',
        };
      case DocumentType.tapu:
        return {
          'il': 'ANKARA',
          'ilce': 'ÇANKAYA',
          'mahalle': 'BAHÇELİEVLER',
          'ada': '1523',
          'parsel': '48',
          'yuzolcumu': '1250.50',
          'malik': 'MEHMET YILMAZ',
          'malikTckn': '10000000146',
        };
      case DocumentType.kimlik:
      case DocumentType.ehliyet:
        return {
          'tckn': '10000000146',
          'ad': 'AHMET MEHMET',
          'soyad': 'YILMAZ',
          'dogumTarihi': '15.03.1990',
        };
      case DocumentType.unknown:
        return null;
    }
  }

  void dispose() {
    _client.close();
  }
}

extension DocumentTypeApiHint on DocumentType {
  /// API `documentType` değeri (`noter` | `tapu` | `kimlik`).
  String? get apiHint {
    switch (this) {
      case DocumentType.noterSozlesmesi:
        return 'noter';
      case DocumentType.tapu:
        return 'tapu';
      case DocumentType.kimlik:
      case DocumentType.ehliyet:
        return 'kimlik';
      case DocumentType.unknown:
        return null;
    }
  }
}

const _kNoterFixture = '''
T.C.
ANKARA 15. NOTERLİĞİ
MOTORLU KARA TAŞITI SATIŞ SÖZLEŞMESİ
Sözleşme No: 2024/4587
Tarih: 12.03.2024
SATICI Adı Soyadı: Mehmet Demir T.C. Kimlik No: 23456789060
ALICI Adı Soyadı: Ayşe Yılmaz T.C. Kimlik No: 10000000146
Plaka No: 06 ABC 123
Şasi No: WVWZZZ3CZWE123456
Satış Bedeli: 1.850.000,00 TL
''';

const _kTapuFixture = '''
T.C. TAPU SENEDİ
İli: ANKARA İlçesi: ÇANKAYA Mahallesi: BAHÇELİEVLER
Ada: 1523 Parsel: 48 Yüzölçümü: 1.250,50 m²
Malik: MEHMET YILMAZ T.C. Kimlik No: 10000000146
''';

const _kKimlikFixture = '''
T.C. KİMLİK KARTI
Soyadı / Surname YILMAZ
Adı / Given Name(s) AHMET MEHMET
Doğum Tarihi / Date of Birth 15.03.1990
T.C. Kimlik No / Identity No 10000000146
''';

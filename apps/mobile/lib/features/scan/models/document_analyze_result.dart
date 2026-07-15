/// Document Agent `POST /api/v1/documents/analyze*` JSON yanıtı.
class DocumentAnalyzeResult {
  const DocumentAnalyzeResult({
    required this.ok,
    required this.documentType,
    required this.overallConfidence,
    required this.warnings,
    required this.parser,
    this.fields,
    this.ocrText,
    this.fromMock = false,
    this.errorMessage,
    this.meta,
  });

  final bool ok;
  final String documentType;
  final Map<String, dynamic>? fields;
  final double overallConfidence;
  final List<String> warnings;
  final String parser;
  final String? ocrText;
  final bool fromMock;
  final String? errorMessage;
  final Map<String, dynamic>? meta;

  factory DocumentAnalyzeResult.fromJson(
    Map<String, dynamic> json, {
    bool fromMock = false,
  }) {
    final fieldsRaw = json['fields'];
    Map<String, dynamic>? fields;
    if (fieldsRaw is Map) {
      fields = Map<String, dynamic>.from(
        fieldsRaw.map((k, v) => MapEntry(k.toString(), v)),
      );
    }

    final warningsRaw = json['warnings'];
    final warnings = warningsRaw is List
        ? warningsRaw.map((e) => e.toString()).toList()
        : <String>[];

    final confidence = json['overallConfidence'];
    final metaRaw = json['meta'];

    return DocumentAnalyzeResult(
      ok: json['ok'] == true,
      documentType: (json['documentType'] ?? 'unknown').toString(),
      fields: fields,
      overallConfidence: confidence is num ? confidence.toDouble() : 0,
      warnings: warnings,
      parser: (json['parser'] ?? 'none').toString(),
      ocrText: json['ocrText']?.toString(),
      fromMock: fromMock,
      meta: metaRaw is Map
          ? Map<String, dynamic>.from(
              metaRaw.map((k, v) => MapEntry(k.toString(), v)),
            )
          : null,
    );
  }

  factory DocumentAnalyzeResult.mockFailure(String message) {
    return DocumentAnalyzeResult(
      ok: false,
      documentType: 'unknown',
      overallConfidence: 0,
      warnings: const [],
      parser: 'none',
      errorMessage: message,
      fromMock: false,
    );
  }

  /// Snackbar / özet satırı için alan özeti.
  String get fieldsSummary {
    final f = fields;
    if (f == null || f.isEmpty) {
      return errorMessage ?? 'Alan bulunamadı';
    }
    final parts = <String>[];
    f.forEach((key, value) {
      if (value == null) return;
      if (value is Map || value is List) {
        parts.add('$key: …');
      } else {
        parts.add('$key: $value');
      }
    });
    if (parts.isEmpty) return 'Alan bulunamadı';
    final joined = parts.take(4).join(' · ');
    return parts.length > 4 ? '$joined · +${parts.length - 4}' : joined;
  }

  List<MapEntry<String, String>> get flatFieldEntries {
    final f = fields;
    if (f == null) return const [];
    final out = <MapEntry<String, String>>[];
    void walk(String prefix, dynamic value) {
      if (value == null) return;
      if (value is Map) {
        value.forEach((k, v) {
          final key = prefix.isEmpty ? k.toString() : '$prefix.$k';
          walk(key, v);
        });
      } else if (value is List) {
        for (var i = 0; i < value.length; i++) {
          walk('$prefix[$i]', value[i]);
        }
      } else {
        out.add(MapEntry(prefix, value.toString()));
      }
    }

    walk('', f);
    return out;
  }
}

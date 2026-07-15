/// OCR Document Agent'a iletilecek belge türü ipucu.
enum DocumentType {
  noterSozlesmesi,
  tapu,
  kimlik,
  ehliyet,
  unknown,
}

extension DocumentTypeLabel on DocumentType {
  String get labelTr {
    switch (this) {
      case DocumentType.noterSozlesmesi:
        return 'Noter Satış Sözleşmesi';
      case DocumentType.tapu:
        return 'Tapu Senedi';
      case DocumentType.kimlik:
        return 'Kimlik';
      case DocumentType.ehliyet:
        return 'Ehliyet';
      case DocumentType.unknown:
        return 'Belge';
    }
  }
}

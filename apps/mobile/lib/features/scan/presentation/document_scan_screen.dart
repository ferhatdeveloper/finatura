import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../models/captured_still.dart';
import '../models/detected_quad.dart';
import '../models/document_analyze_result.dart';
import '../models/document_scan_result.dart';
import '../models/document_type.dart';
import '../services/camera_scan_controller.dart';
import '../services/document_agent_service.dart';
import '../services/scan_image_source.dart';
import 'document_analyze_result_screen.dart';
import 'document_crop_screen.dart';
import 'widgets/camera_viewport.dart';
import 'widgets/scan_shutter_bar.dart';

/// Evrak tarama — gerçek kamera / dosya → crop → Document Agent multipart.
///
/// Navigasyon: `Navigator.pushNamed(context, DocumentScanScreen.routeName)`
/// Dönüş tipi: [DocumentAnalyzeResult]?
class DocumentScanScreen extends StatefulWidget {
  const DocumentScanScreen({
    super.key,
    this.initialDocumentType,
    this.documentAgent,
    this.imageSource,
  });

  static const routeName = '/scan';

  final DocumentType? initialDocumentType;
  final DocumentAgentService? documentAgent;
  final ScanImageSource? imageSource;

  @override
  State<DocumentScanScreen> createState() => _DocumentScanScreenState();
}

class _DocumentScanScreenState extends State<DocumentScanScreen> {
  late final CameraScanController _controller;
  late final DocumentAgentService _agent;
  late final ScanImageSource _imageSource;
  StreamSubscription<DetectedQuad?>? _quadSub;
  DetectedQuad? _quad;
  late DocumentType _documentType;
  bool _ready = false;
  bool _analyzing = false;

  @override
  void initState() {
    super.initState();
    _documentType = widget.initialDocumentType ?? DocumentType.noterSozlesmesi;
    _controller = CameraScanController();
    _agent = widget.documentAgent ?? DocumentAgentService();
    _imageSource = widget.imageSource ?? ScanImageSource();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await _controller.initialize();
    _quadSub = _controller.quadStream.listen((q) {
      if (mounted) setState(() => _quad = q);
    });
    if (mounted) setState(() => _ready = true);
  }

  Future<void> _onCapture() async {
    if (_analyzing) return;

    CapturedStill still;
    try {
      if (_controller.hasLivePreview) {
        still = await _controller.captureStill();
      } else if (_controller.isStubCamera) {
        still = await _controller.captureStill();
      } else {
        // Web / picker-only: sistem kamera veya dosya seçici
        final picked = kIsWeb
            ? await _imageSource.pickFromGallery()
            : await _imageSource.pickFromCamera();
        if (picked == null) return;
        still = picked;
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Yakalama başarısız: $e')),
      );
      return;
    }

    await _openCrop(still);
  }

  Future<void> _onPickGallery() async {
    if (_analyzing) return;
    final still = await _imageSource.pickFromGallery();
    if (still == null || !mounted) return;
    await _openCrop(still);
  }

  Future<void> _openCrop(CapturedStill still) async {
    final refined = await _controller.edgeDetection
            .detectFromImagePath(still.path) ??
        _quad ??
        DetectedQuad.defaultPreviewFrame();

    if (!mounted) return;
    final scan = await Navigator.of(context).push<DocumentScanResult?>(
      MaterialPageRoute(
        builder: (_) => DocumentCropScreen(
          imagePath: still.path,
          imageBytes: still.bytes,
          filename: still.resolvedFilename,
          initialQuad: refined,
          documentType: _documentType,
          isStubImage: _controller.isStubCamera && !still.hasImage,
        ),
      ),
    );

    if (scan == null || !mounted) return;
    await _runAnalyze(scan);
  }

  Future<void> _runAnalyze(DocumentScanResult scan) async {
    setState(() => _analyzing = true);

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const PopScope(
        canPop: false,
        child: Center(
          child: Card(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Document Agent analiz ediyor…'),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    DocumentAnalyzeResult result;
    try {
      result = await _agent.analyzeScan(scan);
    } finally {
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        setState(() => _analyzing = false);
      }
    }

    if (!mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          result.fromMock
              ? 'Mock: ${result.fieldsSummary}'
              : result.fieldsSummary,
        ),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 4),
      ),
    );

    final closed = await Navigator.of(context).push<DocumentAnalyzeResult>(
      MaterialPageRoute(
        builder: (_) => DocumentAnalyzeResultScreen(
          scan: scan,
          analyze: result,
        ),
      ),
    );

    if (closed != null && mounted) {
      Navigator.of(context).pop(closed);
    }
  }

  @override
  void dispose() {
    _quadSub?.cancel();
    _controller.dispose();
    if (widget.documentAgent == null) {
      _agent.dispose();
    }
    super.dispose();
  }

  String get _statusLabel {
    if (!_ready) return 'Kamera hazırlanıyor…';
    if (_analyzing) return 'Analiz ediliyor…';
    if (_controller.isStubCamera) {
      return 'Stub mod (SCAN_NATIVE_CAMERA=false)';
    }
    if (_controller.hasLivePreview) {
      final c = _quad?.confidence;
      return c == null
          ? 'Kenar aranıyor…'
          : 'Kenar güveni: ${(c * 100).toStringAsFixed(0)}%';
    }
    if (kIsWeb) {
      return 'Dosya / galeri seçin (gerçek görüntü)';
    }
    return 'Kamera izni yok — galeri veya sistem kamerası';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B1210),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: const Text('Evrak Tara'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: CameraViewport(
                    quad: _quad,
                    previewChild: _controller.previewWidget,
                    isStub: _controller.isStubCamera,
                    isPickerOnly: _controller.isPickerOnly,
                    statusLabel: _statusLabel,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              ScanShutterBar(
                documentType: _documentType,
                onDocumentTypeChanged: (t) => setState(() => _documentType = t),
                onCapture: (_ready && !_analyzing) ? _onCapture : () {},
                captureEnabled: _ready && !_analyzing,
                onPickGallery:
                    (_ready && !_analyzing) ? _onPickGallery : () {},
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'dart:async';

import 'package:flutter/material.dart';

import '../models/detected_quad.dart';
import '../models/document_analyze_result.dart';
import '../models/document_scan_result.dart';
import '../models/document_type.dart';
import '../services/camera_scan_controller.dart';
import '../services/document_agent_service.dart';
import 'document_analyze_result_screen.dart';
import 'document_crop_screen.dart';
import 'widgets/camera_viewport.dart';
import 'widgets/scan_shutter_bar.dart';

/// Evrak tarama — kamera + canlı kenar overlay → crop → Document Agent.
///
/// Navigasyon: `Navigator.pushNamed(context, DocumentScanScreen.routeName)`
/// Dönüş tipi: [DocumentAnalyzeResult]?
class DocumentScanScreen extends StatefulWidget {
  const DocumentScanScreen({
    super.key,
    this.initialDocumentType,
    this.documentAgent,
  });

  static const routeName = '/scan';

  final DocumentType? initialDocumentType;
  final DocumentAgentService? documentAgent;

  @override
  State<DocumentScanScreen> createState() => _DocumentScanScreenState();
}

class _DocumentScanScreenState extends State<DocumentScanScreen> {
  late final CameraScanController _controller;
  late final DocumentAgentService _agent;
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

    final path = await _controller.captureStill();
    final refined = await _controller.edgeDetection.detectFromImagePath(path) ??
        _quad ??
        DetectedQuad.defaultPreviewFrame();

    if (!mounted) return;
    final scan = await Navigator.of(context).push<DocumentScanResult?>(
      MaterialPageRoute(
        builder: (_) => DocumentCropScreen(
          imagePath: path,
          initialQuad: refined,
          documentType: _documentType,
          isStubImage: _controller.isStubCamera,
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

  @override
  Widget build(BuildContext context) {
    final confidence = _quad?.confidence;
    final nativeHint = _controller.nativeEnable ? ' nativeEnable' : '';
    final status = !_ready
        ? 'Kamera hazırlanıyor…'
        : _analyzing
            ? 'Analiz ediliyor…'
            : confidence == null
                ? 'Kenar aranıyor…'
                : 'Kenar güveni: ${(confidence * 100).toStringAsFixed(0)}%'
                    '${_controller.isStubCamera ? ' (stub$nativeHint)' : ''}';

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
                    statusLabel: status,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              ScanShutterBar(
                documentType: _documentType,
                onDocumentTypeChanged: (t) => setState(() => _documentType = t),
                onCapture: (_ready && !_analyzing) ? _onCapture : () {},
                captureEnabled: _ready && !_analyzing,
                onPickGallery: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Galeri: image_picker pubspec’te açılınca bağlanacak',
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Finatura AŞAMA 2.4 — Kamera & kenar algılama + Document Agent istemcisi.
///
/// Varsayılan stub kamera; `SCAN_NATIVE_CAMERA` / [CameraScanController.nativeEnable]
/// ile native path hazır. Crop sonrası Document Agent HTTP analizi.
library;

export 'config/scan_api_config.dart';
export 'models/detected_quad.dart';
export 'models/document_analyze_result.dart';
export 'models/document_scan_result.dart';
export 'models/document_type.dart';
export 'presentation/document_analyze_result_screen.dart';
export 'presentation/document_crop_screen.dart';
export 'presentation/document_scan_screen.dart';
export 'presentation/widgets/camera_viewport.dart';
export 'presentation/widgets/crop_adjust_handles.dart';
export 'presentation/widgets/edge_quad_painter.dart';
export 'presentation/widgets/scan_shutter_bar.dart';
export 'services/camera_scan_controller.dart';
export 'services/document_agent_service.dart';
export 'services/edge_detection_service.dart';
export 'services/mock_edge_detection_service.dart';
export 'services/native_camera_adapter.dart';

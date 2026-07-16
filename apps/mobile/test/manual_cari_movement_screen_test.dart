import 'dart:convert';

import 'package:finatura_mobile/features/auth/auth.dart';
import 'package:finatura_mobile/features/settlement/data/settlement_repository.dart';
import 'package:finatura_mobile/features/settlement/models/manual_cari_movement.dart';
import 'package:finatura_mobile/features/settlement/presentation/manual_cari_movement_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('ManualCariMovementScreen posts elden tahsilat movement',
      (tester) async {
    SharedPreferences.setMockInitialValues({
      'finatura_auth_session': jsonEncode({
        'accessToken': 'test-token',
        'refreshToken': 'test-refresh',
        'tokenType': 'Bearer',
        'expiresIn': 3600,
        'fromMock': true,
        'user': {
          'id': 'user-1',
          'email': 'demo@finatura.app',
          'displayName': 'Demo Kullanıcı',
          'tenantId': 'tenant-1',
          'tenantSlug': 'demo-galeri',
          'role': 'owner',
        },
      }),
    });

    final auth = AuthController();
    await auth.bootstrap();
    final repository = _RecordingSettlementRepository();

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1B4D3E)),
          useMaterial3: true,
        ),
        home: ManualCariMovementScreen(
          auth: auth,
          repository: repository,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Elden İşlem'), findsOneWidget);
    expect(find.text('Elden tahsilat'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('manualCariSelector')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ahmet Yılmaz').last);
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const ValueKey('manualAmountField')),
      '1250',
    );
    await tester.enterText(
      find.byKey(const ValueKey('manualDescriptionField')),
      'Elden kapora alındı',
    );
    await tester.tap(find.text('Kaydet'));
    await tester.pumpAndSettle();

    expect(repository.lastRequest?.cariId, 'cari-1');
    expect(repository.lastRequest?.operation, ManualCariOperation.tahsilat);
    expect(repository.lastRequest?.assetKind, ManualCariAssetKind.tl);
    expect(repository.lastRequest?.amount, 1250);
    expect(repository.lastRequest?.description, 'Elden kapora alındı');
    expect(find.text('Elden tahsilat kaydedildi.'), findsOneWidget);
  });
}

class _RecordingSettlementRepository extends SettlementRepository {
  _RecordingSettlementRepository()
      : super(
          accessToken: 'test-token',
          tenantId: 'tenant-1',
          allowMock: true,
        );

  ManualCariMovementRequest? lastRequest;

  @override
  Future<List<ManualCariOption>> fetchCariOptions({int limit = 50}) async {
    return const [
      ManualCariOption(id: 'cari-1', title: 'Ahmet Yılmaz'),
      ManualCariOption(id: 'cari-2', title: 'Selin Karaca'),
    ];
  }

  @override
  Future<ManualCariMovementResult> createManualCariMovement(
    ManualCariMovementRequest request,
  ) async {
    lastRequest = request;
    return ManualCariMovementResult(
      id: 'movement-1',
      cariId: request.cariId,
      direction: request.direction,
      assetKind: request.assetKind,
      amount: request.amount,
      currencyCode: request.currencyCode,
      transactionDate: DateTime(2026, 7, 16),
      description: request.description,
    );
  }
}

import 'dart:convert';

import 'package:finatura_mobile/features/auth/auth.dart';
import 'package:finatura_mobile/features/settlement/data/settlement_repository.dart';
import 'package:finatura_mobile/features/settlement/models/bank_transaction.dart';
import 'package:finatura_mobile/features/settlement/models/veresiye_open_debt.dart';
import 'package:finatura_mobile/features/shell/presentation/home_summary_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('HomeSummaryScreen shows banking home from session and data',
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

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1B4D3E)),
          useMaterial3: true,
        ),
        home: HomeSummaryScreen(
          auth: auth,
          repository: _FakeSettlementRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Demo Kullanıcı'), findsOneWidget);
    expect(find.text('demo-galeri'), findsOneWidget);
    expect(find.text('Galeri hesabı'), findsOneWidget);
    expect(find.text('Net finansal durum'), findsOneWidget);
    expect(find.text('Alacak'), findsOneWidget);
    expect(find.text('Verecek'), findsOneWidget);
    expect(find.text('Hızlı işlemler'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Son hareketler'),
      300,
      scrollable: find.byWidgetPredicate(
        (widget) =>
            widget is Scrollable && widget.axisDirection == AxisDirection.down,
      ),
    );

    expect(find.text('Son hareketler'), findsOneWidget);
    expect(find.text('Ahmet Yılmaz'), findsOneWidget);
  });
}

class _FakeSettlementRepository extends SettlementRepository {
  _FakeSettlementRepository()
      : super(
          accessToken: 'test-token',
          tenantId: 'tenant-1',
          allowMock: true,
        );

  @override
  Future<List<BankTransaction>> fetchInboundUnmatched({int limit = 100}) async {
    return [
      BankTransaction(
        id: 'tx-1',
        bankAccountAlias: 'Garanti İşletme',
        direction: BankTxDirection.inbound,
        amount: 125000,
        currencyCode: 'TRY',
        transactionAt: DateTime(2026, 7, 16, 10, 30),
        matchStatus: BankTxMatchStatus.unmatched,
        counterpartyName: 'Ahmet Yılmaz',
        description: 'Araç satış bakiyesi',
      ),
    ];
  }

  @override
  Future<List<VeresiyeOpenDebt>> fetchMatchSuggestions(String bankTxId) async {
    return [
      VeresiyeOpenDebt(
        id: 'ver-1',
        cariId: 'cari-1',
        cariTitle: 'Ahmet Yılmaz',
        assetKind: VeresiyeAssetKind.tl,
        direction: VeresiyeDirection.debit,
        openAmount: 125000,
        currencyCode: 'TRY',
        transactionDate: DateTime(2026, 7, 15),
        matchScore: 92,
      ),
    ];
  }
}

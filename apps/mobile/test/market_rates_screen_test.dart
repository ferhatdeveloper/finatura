import 'package:finatura_mobile/features/rates/rates.dart';
import 'package:finatura_mobile/features/settlement/settlement.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
      'MarketRatesScreen shows fx gold tabs and opens exchange deduction',
      (tester) async {
    final repository = _FakeRatesRepository();
    final settlementRepository = _RecordingSettlementRepository();

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1B4D3E)),
          useMaterial3: true,
        ),
        home: MarketRatesScreen(
          repository: repository,
          settlementRepository: settlementRepository,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Döviz'), findsOneWidget);
    expect(find.text('Altın'), findsOneWidget);
    expect(find.text('USDTRY'), findsWidgets);
    expect(find.textContaining('Kaynak datshop.com.tr'), findsOneWidget);

    await tester.tap(find.text('Cari düş').first);
    await tester.pumpAndSettle();

    expect(find.text('Elden İşlem'), findsOneWidget);
    expect(find.text('Kur ile düşüm'), findsOneWidget);
    expect(find.text('USD'), findsOneWidget);
    expect(find.text('40.22'), findsOneWidget);
  });
}

class _FakeRatesRepository extends RatesRepository {
  _FakeRatesRepository() : super(accessToken: 'test', tenantId: 'tenant');

  @override
  Future<MarketRatesSnapshot> fetchRates() async {
    return MarketRatesSnapshot(
      fx: [
        MarketRate(
          symbol: 'USDTRY',
          label: 'Amerikan Doları',
          category: MarketRateCategory.fx,
          bid: 40.18,
          ask: 40.22,
          changePercent: 0.12,
          updatedAt: DateTime(2026, 7, 16, 16, 20),
          source: 'datshop.com.tr',
        ),
      ],
      gold: [
        MarketRate(
          symbol: 'GRAMALTIN',
          label: 'GRAM ALTIN',
          category: MarketRateCategory.gold,
          bid: 4310,
          ask: 4340,
          changePercent: -0.08,
          updatedAt: DateTime(2026, 7, 16, 16, 20),
          source: 'datshop.com.tr',
        ),
      ],
      fetchedAt: DateTime(2026, 7, 16, 16, 20),
      source: 'datshop.com.tr',
      disclaimer: 'Fiyatlar bilgilendirme amaçlıdır. Kaynak datshop.com.tr.',
    );
  }
}

class _RecordingSettlementRepository extends SettlementRepository {
  _RecordingSettlementRepository()
      : super(
          accessToken: 'test-token',
          tenantId: 'tenant-1',
          allowMock: true,
        );

  @override
  Future<List<ManualCariOption>> fetchCariOptions({int limit = 50}) async {
    return const [
      ManualCariOption(id: 'cari-1', title: 'Ahmet Yılmaz'),
    ];
  }
}

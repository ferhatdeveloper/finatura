import 'package:finatura_mobile/features/auth/config/api_config.dart';
import 'package:finatura_mobile/features/rates/data/rates_repository.dart';
import 'package:finatura_mobile/features/rates/models/market_rate.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('ApiConfig rejects localhost overrides', () {
    expect(
      ApiConfig.sanitizeBaseUrl('http://127.0.0.1:3100'),
      'https://api.finatura.app',
    );
    expect(
      ApiConfig.sanitizeBaseUrl('http://localhost:3000'),
      'https://api.finatura.app',
    );
    expect(
      ApiConfig.sanitizeBaseUrl('https://api.finatura.app'),
      'https://api.finatura.app',
    );
  });

  test('RatesRepository falls back to demo when gateway and truncgil fail',
      () async {
    final client = MockClient((request) async {
      return http.Response('{"error":"tenant_router_unreachable"}', 502);
    });

    final repo = RatesRepository(
      client: client,
      baseUrl: 'https://api.finatura.app',
      accessToken: 't',
      tenantId: 'tenant',
    );

    final snapshot = await repo.fetchRates();
    expect(snapshot.demo, isTrue);
    expect(snapshot.fx, isNotEmpty);
    expect(snapshot.gold, isNotEmpty);
    expect(snapshot.fx.first.symbol, 'USDTRY');
    expect(snapshot.gold.any((g) => g.symbol.contains('GRAM')), isTrue);
  });
}

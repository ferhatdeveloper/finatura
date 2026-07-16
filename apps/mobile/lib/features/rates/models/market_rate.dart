enum MarketRateCategory { fx, gold }

class MarketRate {
  const MarketRate({
    required this.symbol,
    required this.label,
    required this.category,
    required this.bid,
    required this.ask,
    required this.source,
    this.changePercent,
    this.updatedAt,
  });

  final String symbol;
  final String label;
  final MarketRateCategory category;
  final double bid;
  final double ask;
  final double? changePercent;
  final DateTime? updatedAt;
  final String source;

  factory MarketRate.fromJson(Map<String, dynamic> json) {
    return MarketRate(
      symbol: json['symbol'] as String? ?? '',
      label: json['label'] as String? ?? json['symbol'] as String? ?? '',
      category: _categoryFromJson(json['category']),
      bid: _toDouble(json['bid']),
      ask: _toDouble(json['ask']),
      changePercent: _toDoubleOrNull(json['changePercent']),
      updatedAt: _dateOrNull(json['updatedAt']),
      source: json['source'] as String? ?? 'datshop.com.tr',
    );
  }
}

class MarketRatesSnapshot {
  const MarketRatesSnapshot({
    required this.fx,
    required this.gold,
    required this.fetchedAt,
    required this.source,
    required this.disclaimer,
    this.stale = false,
    this.demo = false,
  });

  final List<MarketRate> fx;
  final List<MarketRate> gold;
  final DateTime fetchedAt;
  final String source;
  final String disclaimer;
  final bool stale;
  final bool demo;

  factory MarketRatesSnapshot.fromJson(Map<String, dynamic> json) {
    return MarketRatesSnapshot(
      fx: _rateList(json['fx']),
      gold: _rateList(json['gold']),
      fetchedAt: _dateOrNull(json['fetchedAt']) ?? DateTime.now(),
      source: json['source'] as String? ?? 'datshop.com.tr',
      disclaimer: json['disclaimer'] as String? ??
          'Fiyatlar bilgilendirme amaçlıdır. Kaynak datshop.com.tr.',
      stale: json['stale'] == true,
      demo: json['demo'] == true,
    );
  }

  factory MarketRatesSnapshot.fromTruncgil(Map<String, dynamic> json) {
    final updatedAt = _dateOrNull(json['Update_Date']);
    final fx = <MarketRate>[];
    final gold = <MarketRate>[];

    for (final entry in json.entries) {
      if (entry.key == 'Update_Date' || entry.value is! Map) continue;
      final row = Map<String, dynamic>.from(entry.value as Map);
      final type = (row['Type'] ?? row['type'] ?? '').toString().toLowerCase();
      final bid = _toDouble(row['Buying'] ?? row['buying'] ?? row['alis']);
      final ask = _toDouble(row['Selling'] ?? row['selling'] ?? row['satis']);
      if (bid <= 0 || ask <= 0) continue;

      final key = entry.key;
      final isGold = type.contains('gold') ||
          type.contains('altin') ||
          RegExp(r'altin|gram|ceyrek|yarim|tam|ata|ons|gumus|ayar',
                  caseSensitive: false)
              .hasMatch(key);
      final isFx = type.contains('currency') ||
          type.contains('doviz') ||
          RegExp(r'USD|EUR|GBP|CHF|JPY|SAR|AUD|CAD').hasMatch(key);
      if (!isGold && !isFx) continue;

      final symbol = isGold
          ? key.replaceAll(RegExp(r'\s+'), '').toUpperCase()
          : (key.length == 3 ? '${key.toUpperCase()}TRY' : key.toUpperCase());

      final rate = MarketRate(
        symbol: symbol,
        label: _truncgilLabel(key),
        category: isGold ? MarketRateCategory.gold : MarketRateCategory.fx,
        bid: bid,
        ask: ask,
        changePercent: _toDoubleOrNull(row['Change'] ?? row['change']),
        updatedAt: updatedAt,
        source: 'finans.truncgil.com',
      );
      if (isGold) {
        gold.add(rate);
      } else {
        fx.add(rate);
      }
    }

    return MarketRatesSnapshot(
      fx: fx,
      gold: gold,
      fetchedAt: DateTime.now(),
      source: 'finans.truncgil.com',
      disclaimer:
          'Fiyatlar bilgilendirme amaçlıdır. Kaynak finans.truncgil.com.',
      stale: false,
      demo: false,
    );
  }

  factory MarketRatesSnapshot.demo({String? note}) {
    const source = 'demo';
    return MarketRatesSnapshot(
      fx: const [
        MarketRate(
          symbol: 'USDTRY',
          label: 'Amerikan Doları',
          category: MarketRateCategory.fx,
          bid: 40.18,
          ask: 40.22,
          changePercent: 0.12,
          source: source,
        ),
        MarketRate(
          symbol: 'EURTRY',
          label: 'Euro',
          category: MarketRateCategory.fx,
          bid: 43.55,
          ask: 43.62,
          changePercent: -0.08,
          source: source,
        ),
        MarketRate(
          symbol: 'GBPTRY',
          label: 'Sterlin',
          category: MarketRateCategory.fx,
          bid: 51.10,
          ask: 51.35,
          changePercent: 0.21,
          source: source,
        ),
        MarketRate(
          symbol: 'CHFTRY',
          label: 'İsviçre Frangı',
          category: MarketRateCategory.fx,
          bid: 45.80,
          ask: 46.05,
          changePercent: 0.05,
          source: source,
        ),
      ],
      gold: const [
        MarketRate(
          symbol: 'HASALTIN',
          label: 'HAS ALTIN',
          category: MarketRateCategory.gold,
          bid: 4285,
          ask: 4305,
          changePercent: 0.18,
          source: source,
        ),
        MarketRate(
          symbol: 'ONS',
          label: 'ONS',
          category: MarketRateCategory.gold,
          bid: 3320,
          ask: 3328,
          changePercent: 0.10,
          source: source,
        ),
        MarketRate(
          symbol: 'USDKG',
          label: 'USD KG',
          category: MarketRateCategory.gold,
          bid: 106700,
          ask: 107050,
          changePercent: 0.09,
          source: source,
        ),
        MarketRate(
          symbol: 'EURKG',
          label: 'EUR KG',
          category: MarketRateCategory.gold,
          bid: 98750,
          ask: 99120,
          changePercent: -0.05,
          source: source,
        ),
        MarketRate(
          symbol: 'AYAR22',
          label: '22 AYAR',
          category: MarketRateCategory.gold,
          bid: 3960,
          ask: 4010,
          changePercent: 0.15,
          source: source,
        ),
        MarketRate(
          symbol: 'GRAMALTIN',
          label: 'GRAM ALTIN',
          category: MarketRateCategory.gold,
          bid: 4310,
          ask: 4340,
          changePercent: -0.08,
          source: source,
        ),
        MarketRate(
          symbol: 'ALTINGUMUS',
          label: 'ALTIN GÜMÜŞ',
          category: MarketRateCategory.gold,
          bid: 48.2,
          ask: 49.1,
          changePercent: 0.22,
          source: source,
        ),
        MarketRate(
          symbol: 'YENICEYREK',
          label: 'YENİ ÇEYREK',
          category: MarketRateCategory.gold,
          bid: 7020,
          ask: 7180,
          changePercent: 0.14,
          source: source,
        ),
        MarketRate(
          symbol: 'ESKICEYREK',
          label: 'ESKİ ÇEYREK',
          category: MarketRateCategory.gold,
          bid: 6880,
          ask: 7020,
          changePercent: 0.11,
          source: source,
        ),
      ],
      fetchedAt: DateTime.now(),
      source: source,
      disclaimer: note ??
          'Demo fiyatlar — bilgilendirme amaçlıdır, işlem için kullanmayın.',
      stale: true,
      demo: true,
    );
  }
}

List<MarketRate> _rateList(Object? raw) {
  if (raw is! List) return const [];
  return raw
      .whereType<Map<String, dynamic>>()
      .map(MarketRate.fromJson)
      .where((rate) => rate.symbol.isNotEmpty)
      .toList();
}

MarketRateCategory _categoryFromJson(Object? raw) {
  return raw?.toString().toLowerCase() == 'gold'
      ? MarketRateCategory.gold
      : MarketRateCategory.fx;
}

double _toDouble(Object? raw) {
  if (raw is num) return raw.toDouble();
  if (raw is String) return double.tryParse(raw.replaceAll(',', '.')) ?? 0;
  return 0;
}

double? _toDoubleOrNull(Object? raw) {
  if (raw == null) return null;
  return _toDouble(raw);
}

DateTime? _dateOrNull(Object? raw) {
  if (raw is! String || raw.trim().isEmpty) return null;
  return DateTime.tryParse(raw.trim().replaceAll(' ', 'T'));
}

String _truncgilLabel(String key) {
  const map = {
    'USD': 'Amerikan Doları',
    'EUR': 'Euro',
    'GBP': 'Sterlin',
    'CHF': 'İsviçre Frangı',
    'SAR': 'Suudi Riyali',
    'gram-altin': 'GRAM ALTIN',
    'gram_altin': 'GRAM ALTIN',
    'ceyrek-altin': 'YENİ ÇEYREK',
    'ceyrek_altin': 'YENİ ÇEYREK',
    'Ons': 'ONS',
    'ONS': 'ONS',
  };
  return map[key] ??
      key.replaceAll('_', ' ').replaceAll('-', ' ').toUpperCase();
}

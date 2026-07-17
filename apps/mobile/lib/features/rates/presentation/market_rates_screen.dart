import 'package:finatura_mobile/features/auth/services/auth_controller.dart';
import 'package:finatura_mobile/features/settlement/settlement.dart';
import 'package:flutter/material.dart';

import '../data/rates_repository.dart';
import '../models/market_rate.dart';

const _finaturaGreen = Color(0xFF123C31);
const _finaturaGold = Color(0xFFD6A84F);

class MarketRatesScreen extends StatefulWidget {
  const MarketRatesScreen({
    super.key,
    this.auth,
    this.repository,
    this.settlementRepository,
  });

  static const routeName = '/rates';

  final AuthController? auth;
  final RatesRepository? repository;
  final SettlementRepository? settlementRepository;

  @override
  State<MarketRatesScreen> createState() => _MarketRatesScreenState();
}

class _MarketRatesScreenState extends State<MarketRatesScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  RatesRepository? _ownedRepo;
  SettlementRepository? _ownedSettlementRepo;
  MarketRatesSnapshot? _snapshot;
  bool _loading = true;
  String? _error;

  RatesRepository? get _repo => widget.repository ?? _ownedRepo;

  SettlementRepository? get _settlementRepo =>
      widget.settlementRepository ?? _ownedSettlementRepo;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _bootstrapRepos();
    _loadRates();
  }

  void _bootstrapRepos() {
    final session = widget.auth?.session;
    if (widget.repository == null) {
      _ownedRepo = RatesRepository(
        accessToken: session?.accessToken ?? '',
        tenantId: session?.user.tenantId ?? '',
      );
    }
    if (widget.settlementRepository == null) {
      _ownedSettlementRepo = SettlementRepository(
        accessToken: session?.accessToken ?? '',
        tenantId: session?.user.tenantId ?? '',
        allowMock: session?.fromMock ?? SettlementApiConfig.allowMock,
      );
    }
  }

  Future<void> _loadRates() async {
    final repo = _repo;
    if (repo == null) {
      setState(() {
        _loading = false;
        _error = 'Oturum veya API istemcisi hazır değil.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final snapshot = await repo.fetchRates();
      if (!mounted) return;
      setState(() {
        _snapshot = snapshot;
        _loading = false;
      });
    } on RatesException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Beklenmeyen hata: $e';
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _ownedRepo?.dispose();
    _ownedSettlementRepo?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          _RatesHero(
            rates: _snapshot?.fx.take(6).toList() ?? const [],
            loading: _loading,
            onRefresh: _loading ? null : _loadRates,
          ),
          Expanded(child: _buildBody(theme)),
        ],
      ),
      bottomNavigationBar: _RatesBottomTabs(controller: _tabController),
    );
  }

  Widget _buildBody(ThemeData theme) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return _RatesError(message: _error!, onRetry: _loadRates);
    }

    final snapshot = _snapshot;
    if (snapshot == null) {
      return _RatesError(
        message: 'Kur ve altın verisi bulunamadı.',
        onRetry: _loadRates,
      );
    }

    return TabBarView(
      controller: _tabController,
      children: [
        _RateCategoryView(
          rates: snapshot.fx,
          disclaimer: snapshot.disclaimer,
          fetchedAt: snapshot.fetchedAt,
          stale: snapshot.stale,
          demo: snapshot.demo,
          onDeduct: _openExchangeDeduction,
        ),
        _RateCategoryView(
          rates: snapshot.gold,
          disclaimer: snapshot.disclaimer,
          fetchedAt: snapshot.fetchedAt,
          stale: snapshot.stale,
          demo: snapshot.demo,
          onDeduct: _openExchangeDeduction,
        ),
      ],
    );
  }

  void _openExchangeDeduction(MarketRate rate) {
    final repo = _settlementRepo;
    final prefill = _prefillFor(rate);
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ManualCariMovementScreen(
          auth: widget.auth,
          repository: repo,
          prefill: prefill,
        ),
      ),
    );
  }

  ManualCariMovementPrefill _prefillFor(MarketRate rate) {
    final isFx = rate.category == MarketRateCategory.fx;
    final currencyCode = isFx ? _currencyFromSymbol(rate.symbol) : 'TRY';
    final description =
        'Kur ile düşüm - ${rate.symbol} satış ${_formatNumber(rate.ask)}';

    return ManualCariMovementPrefill(
      assetKind: isFx ? ManualCariAssetKind.fx : ManualCariAssetKind.gold,
      currencyCode: currencyCode,
      amount: isFx ? null : rate.ask,
      goldGrams: isFx ? null : 1,
      goldPurity: _goldPurity(rate.symbol),
      fxRate: rate.ask,
      description: description,
    );
  }
}

class _RatesHero extends StatelessWidget {
  const _RatesHero({
    required this.rates,
    required this.loading,
    required this.onRefresh,
  });

  final List<MarketRate> rates;
  final bool loading;
  final VoidCallback? onRefresh;

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.paddingOf(context).top;
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(12, topPadding + 8, 12, 14),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1729B5),
            Color(0xFF21148F),
            Color(0xFF291079),
          ],
        ),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 42,
            child: Row(
              children: [
                IconButton(
                  tooltip: 'Menü',
                  onPressed: () {},
                  icon: const Icon(Icons.menu_rounded, color: Colors.white),
                ),
                const Expanded(
                  child: Text(
                    'FINATURA',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 25,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 5,
                      fontFamily: 'serif',
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Yenile',
                  onPressed: onRefresh,
                  icon: Icon(
                    loading
                        ? Icons.hourglass_top_rounded
                        : Icons.notifications_rounded,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          _TickerStrip(rates: rates),
        ],
      ),
    );
  }
}

class _RateCategoryView extends StatelessWidget {
  const _RateCategoryView({
    required this.rates,
    required this.disclaimer,
    required this.fetchedAt,
    required this.stale,
    required this.demo,
    required this.onDeduct,
  });

  final List<MarketRate> rates;
  final String disclaimer;
  final DateTime fetchedAt;
  final bool stale;
  final bool demo;
  final ValueChanged<MarketRate> onDeduct;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (rates.isEmpty) {
      return _RatesEmpty(disclaimer: disclaimer);
    }

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        if (demo) ...[
          Container(
            margin: const EdgeInsets.fromLTRB(14, 12, 14, 0),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _finaturaGold.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              'Demo fiyatlar — canlı kaynak şu an yanıt vermiyor. İşlem için kullanmayın.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: _finaturaGreen,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
        _MarketColumnHeader(
          fetchedAt: fetchedAt,
          stale: stale,
          demo: demo,
        ),
        _RatesTable(
          rates: rates,
          fetchedAt: fetchedAt,
          onDeduct: onDeduct,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 26),
          child: Text(
            disclaimer,
            style: theme.textTheme.bodySmall?.copyWith(
              color: const Color(0xFF96A0AE),
              height: 1.2,
            ),
          ),
        ),
      ],
    );
  }
}

class _TickerStrip extends StatelessWidget {
  const _TickerStrip({required this.rates});

  final List<MarketRate> rates;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 78,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 2),
        scrollDirection: Axis.horizontal,
        itemCount: rates.length,
        separatorBuilder: (_, __) => const SizedBox(width: 0),
        itemBuilder: (context, index) => _TickerCard(rate: rates[index]),
      ),
    );
  }
}

class _TickerCard extends StatelessWidget {
  const _TickerCard({required this.rate});

  final MarketRate rate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final positive = (rate.changePercent ?? 0) >= 0;
    final changeColor =
        positive ? const Color(0xFF24A766) : const Color(0xFFFF4A57);

    return Container(
      width: 116,
      padding: const EdgeInsets.fromLTRB(4, 2, 12, 0),
      decoration: BoxDecoration(
        border: Border(
          right: BorderSide(color: Colors.white.withValues(alpha: 0.14)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            rate.symbol,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelSmall?.copyWith(
              color: const Color(0xFF65A7FF),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _formatNumber(rate.ask),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.titleLarge?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w500,
              height: 1,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _formatChange(rate.changePercent),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: changeColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: CustomPaint(
                  size: const Size(double.infinity, 18),
                  painter: _SparklinePainter(
                    color: changeColor,
                    positive: positive,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MarketColumnHeader extends StatelessWidget {
  const _MarketColumnHeader({
    required this.fetchedAt,
    required this.stale,
    required this.demo,
  });

  final DateTime fetchedAt;
  final bool stale;
  final bool demo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      color: const Color(0xFFEFF3F8),
      padding: const EdgeInsets.fromLTRB(14, 9, 14, 8),
      child: Row(
        children: [
          Expanded(
            flex: 42,
            child: Row(
              children: [
                Text(
                  'Birim',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF566B86),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 5),
                const Icon(
                  Icons.swap_vert_rounded,
                  size: 15,
                  color: Color(0xFF566B86),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 26,
            child: Text(
              'Alış',
              textAlign: TextAlign.right,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF566B86),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            flex: 32,
            child: Text(
              'Satış',
              textAlign: TextAlign.right,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF566B86),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RatesTable extends StatelessWidget {
  const _RatesTable({
    required this.rates,
    required this.fetchedAt,
    required this.onDeduct,
  });

  final List<MarketRate> rates;
  final DateTime fetchedAt;
  final ValueChanged<MarketRate> onDeduct;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        for (final rate in rates)
          _RateRow(
            rate: rate,
            fallbackTime: fetchedAt,
            dividerColor: theme.colorScheme.outlineVariant,
            onDeduct: onDeduct,
          ),
      ],
    );
  }
}

class _RateRow extends StatelessWidget {
  const _RateRow({
    required this.rate,
    required this.fallbackTime,
    required this.dividerColor,
    required this.onDeduct,
  });

  final MarketRate rate;
  final DateTime fallbackTime;
  final Color dividerColor;
  final ValueChanged<MarketRate> onDeduct;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final changeColor =
        (rate.changePercent ?? 0) >= 0 ? const Color(0xFF168C42) : Colors.red;
    final updatedAt = rate.updatedAt ?? fallbackTime;
    return Material(
      color: Colors.white,
      child: InkWell(
        onTap: () => onDeduct(rate),
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: dividerColor)),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 9, 14, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  flex: 42,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              rate.symbol,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: const Color(0xFF536A86),
                                fontWeight: FontWeight.w500,
                                height: 1.05,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(
                            Icons.access_time_rounded,
                            size: 12,
                            color: Color(0xFF9BA7B5),
                          ),
                          const SizedBox(width: 2),
                          Text(
                            _formatTime(updatedAt),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: const Color(0xFF8A96A6),
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        rate.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: const Color(0xFF738196),
                          height: 1.1,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  flex: 26,
                  child: _PriceText(_formatNumber(rate.bid)),
                ),
                Expanded(
                  flex: 32,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _PriceText(_formatNumber(rate.ask)),
                      const SizedBox(height: 1),
                      Text(
                        _formatChange(rate.changePercent),
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: changeColor,
                          height: 1,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PriceText extends StatelessWidget {
  const _PriceText(this.value);

  final String value;

  @override
  Widget build(BuildContext context) {
    return Text(
      value,
      textAlign: TextAlign.right,
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: const Color(0xFF526884),
            fontSize: 20,
            fontWeight: FontWeight.w400,
            height: 1.1,
          ),
    );
  }
}

class _RatesBottomTabs extends StatelessWidget {
  const _RatesBottomTabs({required this.controller});

  final TabController controller;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        height: 64,
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            top:
                BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
          ),
        ),
        child: TabBar(
          controller: controller,
          indicatorColor: Colors.transparent,
          labelColor: const Color(0xFF1B43C9),
          unselectedLabelColor: const Color(0xFFB9C2D0),
          labelStyle:
              const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          unselectedLabelStyle:
              const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
          tabs: const [
            Tab(icon: Icon(Icons.currency_exchange_rounded), text: 'Döviz'),
            Tab(icon: Icon(Icons.account_balance_rounded), text: 'Altın'),
          ],
        ),
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  _SparklinePainter({required this.color, required this.positive});

  final Color color;
  final bool positive;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;
    final path = Path();
    final points = positive
        ? [0.65, 0.55, 0.62, 0.42, 0.48, 0.26]
        : [0.28, 0.38, 0.32, 0.52, 0.48, 0.72];
    for (var i = 0; i < points.length; i++) {
      final x = size.width * (i / (points.length - 1));
      final y = size.height * points[i];
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.positive != positive;
  }
}

class _RatesError extends StatelessWidget {
  const _RatesError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded,
                size: 44, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(
              'Kur verisi yüklenemedi',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: onRetry,
              child: const Text('Yeniden dene'),
            ),
          ],
        ),
      ),
    );
  }
}

class _RatesEmpty extends StatelessWidget {
  const _RatesEmpty({required this.disclaimer});

  final String disclaimer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.price_change_outlined, size: 44),
            const SizedBox(height: 12),
            const Text('Piyasa listesi boş'),
            const SizedBox(height: 6),
            Text(
              disclaimer,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _currencyFromSymbol(String symbol) {
  final normalized = symbol.replaceAll(RegExp(r'[^A-Z]'), '').toUpperCase();
  if (normalized.length >= 3) return normalized.substring(0, 3);
  return 'USD';
}

double? _goldPurity(String symbol) {
  return symbol.contains('22') ? 22 : null;
}

String _formatNumber(double value) {
  final fractionDigits = value >= 1000 ? 2 : 4;
  var formatted = value.toStringAsFixed(fractionDigits);
  while (formatted.contains('.') && formatted.endsWith('0')) {
    formatted = formatted.substring(0, formatted.length - 1);
  }
  if (formatted.endsWith('.')) {
    formatted = formatted.substring(0, formatted.length - 1);
  }
  return formatted;
}

String _formatChange(double? value) {
  if (value == null) return '-';
  final sign = value > 0 ? '+' : '';
  return '$sign${value.toStringAsFixed(2)}%';
}

String _formatTime(DateTime value) {
  final hour = value.hour.toString().padLeft(2, '0');
  final minute = value.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}

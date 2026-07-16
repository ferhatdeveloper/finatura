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
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text('Kur & Altın'),
        actions: [
          IconButton(
            tooltip: 'Yenile',
            onPressed: _loading ? null : _loadRates,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: _finaturaGold,
          labelColor: _finaturaGreen,
          tabs: const [
            Tab(text: 'Döviz'),
            Tab(text: 'Altın'),
          ],
        ),
      ),
      body: _buildBody(theme),
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
          title: 'Döviz piyasası',
          rates: snapshot.fx,
          disclaimer: snapshot.disclaimer,
          fetchedAt: snapshot.fetchedAt,
          stale: snapshot.stale,
          demo: snapshot.demo,
          onDeduct: _openExchangeDeduction,
        ),
        _RateCategoryView(
          title: 'Altın piyasası',
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

class _RateCategoryView extends StatelessWidget {
  const _RateCategoryView({
    required this.title,
    required this.rates,
    required this.disclaimer,
    required this.fetchedAt,
    required this.stale,
    required this.demo,
    required this.onDeduct,
  });

  final String title;
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
      return _RatesEmpty(title: title, disclaimer: disclaimer);
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
      children: [
        if (demo) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _finaturaGold.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              'Demo fiyatlar — canlı kaynak şu an yanıt vermiyor. İşlem için kullanmayın.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: _finaturaGreen,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
        _TickerStrip(rates: rates.take(8).toList()),
        const SizedBox(height: 16),
        _SectionHeader(
          title: title,
          fetchedAt: fetchedAt,
          stale: stale,
          demo: demo,
        ),
        const SizedBox(height: 10),
        _RatesTable(rates: rates, onDeduct: onDeduct),
        const SizedBox(height: 14),
        Text(
          disclaimer,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
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
      height: 116,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: rates.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
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
        positive ? const Color(0xFF15803D) : Colors.red.shade700;

    return Container(
      width: 148,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: theme.colorScheme.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 14,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            rate.symbol,
            style: theme.textTheme.labelLarge?.copyWith(
              color: _finaturaGreen,
              fontWeight: FontWeight.w900,
            ),
          ),
          const Spacer(),
          CustomPaint(
            size: const Size(double.infinity, 24),
            painter: _SparklinePainter(
              color: changeColor,
              positive: positive,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Text(
                  _formatNumber(rate.ask),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                _formatChange(rate.changePercent),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: changeColor,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.fetchedAt,
    required this.stale,
    required this.demo,
  });

  final String title;
  final DateTime fetchedAt;
  final bool stale;
  final bool demo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w900,
              color: _finaturaGreen,
            ),
          ),
        ),
        Text(
          '${demo ? 'Demo · ' : (stale ? 'Önbellek · ' : '')}${_formatTime(fetchedAt)}',
          style: theme.textTheme.labelMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _RatesTable extends StatelessWidget {
  const _RatesTable({
    required this.rates,
    required this.onDeduct,
  });

  final List<MarketRate> rates;
  final ValueChanged<MarketRate> onDeduct;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
            child: Row(
              children: [
                Expanded(flex: 3, child: _HeaderText('Birim')),
                Expanded(child: _HeaderText('Alış', alignRight: true)),
                Expanded(child: _HeaderText('Satış', alignRight: true)),
                const SizedBox(width: 80),
              ],
            ),
          ),
          Divider(height: 1, color: theme.colorScheme.outlineVariant),
          for (final rate in rates) _RateRow(rate: rate, onDeduct: onDeduct),
        ],
      ),
    );
  }
}

class _HeaderText extends StatelessWidget {
  const _HeaderText(this.text, {this.alignRight = false});

  final String text;
  final bool alignRight;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: alignRight ? TextAlign.right : TextAlign.left,
      style: Theme.of(context).textTheme.labelMedium?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w800,
          ),
    );
  }
}

class _RateRow extends StatelessWidget {
  const _RateRow({
    required this.rate,
    required this.onDeduct,
  });

  final MarketRate rate;
  final ValueChanged<MarketRate> onDeduct;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final changeColor =
        (rate.changePercent ?? 0) >= 0 ? const Color(0xFF15803D) : Colors.red;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  rate.symbol,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: _finaturaGreen,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${rate.label} · ${_formatChange(rate.changePercent)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style:
                      theme.textTheme.bodySmall?.copyWith(color: changeColor),
                ),
              ],
            ),
          ),
          Expanded(child: _PriceText(_formatNumber(rate.bid))),
          Expanded(child: _PriceText(_formatNumber(rate.ask))),
          const SizedBox(width: 8),
          TextButton(
            onPressed: () => onDeduct(rate),
            child: const Text('Cari düş'),
          ),
        ],
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
            fontWeight: FontWeight.w700,
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
  const _RatesEmpty({required this.title, required this.disclaimer});

  final String title;
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
            Text('$title listesi boş'),
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

import 'package:flutter/material.dart';
import 'package:finatura_mobile/features/auth/models/auth_session.dart';
import 'package:finatura_mobile/features/auth/services/auth_controller.dart';
import 'package:finatura_mobile/features/rates/rates.dart';
import 'package:finatura_mobile/features/settlement/config/settlement_api_config.dart';
import 'package:finatura_mobile/features/settlement/data/settlement_repository.dart';
import 'package:finatura_mobile/features/settlement/models/bank_transaction.dart';
import 'package:finatura_mobile/features/settlement/models/veresiye_open_debt.dart';

const _finaturaGreen = Color(0xFF123C31);
const _finaturaGold = Color(0xFFD6A84F);

/// Ana ekran — giriş sonrası banka uygulaması hissinde finans özeti.
class HomeSummaryScreen extends StatefulWidget {
  const HomeSummaryScreen({
    super.key,
    this.auth,
    this.repository,
    this.ratesRepository,
  });

  static const routeName = '/home';

  final AuthController? auth;
  final SettlementRepository? repository;
  final RatesRepository? ratesRepository;

  @override
  State<HomeSummaryScreen> createState() => _HomeSummaryScreenState();
}

class _HomeSummaryScreenState extends State<HomeSummaryScreen> {
  SettlementRepository? _ownedRepo;
  RatesRepository? _ownedRatesRepo;
  late Future<_DashboardSnapshot> _snapshot;

  AuthSession? get _session => widget.auth?.session;

  @override
  void initState() {
    super.initState();
    _bootstrapRepo();
    _snapshot = _loadSnapshot();
  }

  @override
  void didUpdateWidget(covariant HomeSummaryScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.auth?.session != widget.auth?.session ||
        oldWidget.repository != widget.repository ||
        oldWidget.ratesRepository != widget.ratesRepository) {
      _ownedRepo?.dispose();
      _ownedRatesRepo?.dispose();
      _ownedRepo = null;
      _ownedRatesRepo = null;
      _bootstrapRepo();
      _snapshot = _loadSnapshot();
    }
  }

  @override
  void dispose() {
    _ownedRepo?.dispose();
    _ownedRatesRepo?.dispose();
    super.dispose();
  }

  void _bootstrapRepo() {
    final session = _session;
    if (session == null) return;

    if (widget.repository == null) {
      _ownedRepo = SettlementRepository(
        accessToken: session.accessToken,
        tenantId: session.user.tenantId,
        allowMock: session.fromMock || SettlementApiConfig.allowMock,
      );
    }
    if (widget.ratesRepository == null) {
      _ownedRatesRepo = RatesRepository(
        accessToken: session.accessToken,
        tenantId: session.user.tenantId,
      );
    }
  }

  Future<_DashboardSnapshot> _loadSnapshot() async {
    final repo = widget.repository ?? _ownedRepo;
    final ratesRepo = widget.ratesRepository ?? _ownedRatesRepo;
    final session = _session;
    if (repo == null || session == null) {
      return _DashboardSnapshot.empty(session: session);
    }

    final ratesFuture = ratesRepo?.fetchRates();
    final transactions = await repo.fetchInboundUnmatched(limit: 5);
    final openTransactions = transactions.where((tx) => tx.isOpen).toList();
    final suggestions = await Future.wait(
      openTransactions.map((tx) => repo.fetchMatchSuggestions(tx.id)),
    );
    MarketRatesSnapshot? rates;
    try {
      rates = await ratesFuture;
    } catch (_) {
      rates = null;
    }

    return _DashboardSnapshot.fromData(
      session: session,
      transactions: openTransactions,
      debts: suggestions.expand((items) => items).toList(),
      usesMock: session.fromMock || repo.allowMock,
      rates: rates,
    );
  }

  void _refresh() {
    setState(() {
      _snapshot = _loadSnapshot();
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: scheme.surface,
      body: SafeArea(
        child: FutureBuilder<_DashboardSnapshot>(
          future: _snapshot,
          builder: (context, snapshot) {
            final data = snapshot.data ??
                _DashboardSnapshot.empty(
                  session: _session,
                );
            final loading =
                snapshot.connectionState == ConnectionState.waiting &&
                    !snapshot.hasData;
            final error = snapshot.hasError ? snapshot.error.toString() : null;

            return RefreshIndicator(
              onRefresh: () async {
                _refresh();
                await _snapshot;
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
                children: [
                  _AccountHeader(snapshot: data, onRefresh: _refresh),
                  const SizedBox(height: 16),
                  if (loading) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: const LinearProgressIndicator(minHeight: 4),
                    ),
                    const SizedBox(height: 14),
                  ],
                  if (error != null) ...[
                    _DashboardNotice(
                      message: 'Özet verileri alınamadı: $error',
                      onRetry: _refresh,
                    ),
                    const SizedBox(height: 14),
                  ],
                  _BalanceHero(snapshot: data),
                  const SizedBox(height: 16),
                  if (data.marketRates.isNotEmpty) ...[
                    _MarketOverview(snapshot: data),
                    const SizedBox(height: 18),
                  ],
                  const _ActionShortcuts(),
                  const SizedBox(height: 18),
                  _ReceivablePayableGrid(snapshot: data),
                  const SizedBox(height: 20),
                  _RecentTransactionsList(transactions: data.transactions),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _DashboardSnapshot {
  const _DashboardSnapshot({
    required this.session,
    required this.transactions,
    required this.debts,
    required this.usesMock,
    required this.rates,
  });

  final AuthSession? session;
  final List<BankTransaction> transactions;
  final List<VeresiyeOpenDebt> debts;
  final bool usesMock;
  final MarketRatesSnapshot? rates;

  double get inboundTotal => transactions.fold(
        0,
        (sum, tx) => sum + (tx.isInbound ? tx.amount : 0),
      );

  double get receivableTotal => debts
      .where((debt) => debt.direction == VeresiyeDirection.debit)
      .fold(0, (sum, debt) => sum + debt.openAmount);

  double get payableTotal => debts
      .where((debt) => debt.direction == VeresiyeDirection.credit)
      .fold(0, (sum, debt) => sum + debt.openAmount);

  int get openCount => transactions.length;

  List<MarketRate> get marketRates {
    final snapshot = rates;
    if (snapshot == null) return const [];
    return [
      ...snapshot.fx.take(2),
      ...snapshot.gold.take(2),
    ];
  }

  factory _DashboardSnapshot.empty({AuthSession? session}) {
    return _DashboardSnapshot(
      session: session,
      transactions: const [],
      debts: const [],
      usesMock: session?.fromMock ?? false,
      rates: null,
    );
  }

  factory _DashboardSnapshot.fromData({
    required AuthSession session,
    required List<BankTransaction> transactions,
    required List<VeresiyeOpenDebt> debts,
    required bool usesMock,
    required MarketRatesSnapshot? rates,
  }) {
    return _DashboardSnapshot(
      session: session,
      transactions: transactions,
      debts: debts,
      usesMock: usesMock,
      rates: rates,
    );
  }
}

class _AccountHeader extends StatelessWidget {
  const _AccountHeader({
    required this.snapshot,
    required this.onRefresh,
  });

  final _DashboardSnapshot snapshot;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final user = snapshot.session?.user;
    final name = _cleanOr(user?.displayName, 'Finatura kullanıcısı');
    final tenant = _cleanOr(user?.tenantSlug, 'Galeri bilgisi yok');
    final role = _cleanOr(user?.role, 'yetkili');

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Merhaba, ${_firstName(name)}',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                name,
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: scheme.onSurface,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _Pill(
                    label: 'Galeri hesabı',
                    color: scheme.primaryContainer,
                    textColor: scheme.onPrimaryContainer,
                  ),
                  Text(
                    tenant,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  _Pill(
                    label: role,
                    color: scheme.surfaceContainerHighest,
                    textColor: scheme.onSurfaceVariant,
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Column(
          children: [
            IconButton.filledTonal(
              tooltip: 'Yenile',
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh_rounded),
            ),
            const SizedBox(height: 8),
            CircleAvatar(
              radius: 22,
              backgroundColor: _finaturaGreen,
              child: const Icon(
                Icons.storefront_rounded,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _BalanceHero extends StatelessWidget {
  const _BalanceHero({required this.snapshot});

  final _DashboardSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final balance = snapshot.inboundTotal - snapshot.payableTotal;

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: _finaturaGreen,
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: _finaturaGreen.withValues(alpha: 0.24),
            blurRadius: 26,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Net finansal durum',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.86),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              _Pill(
                label: snapshot.usesMock ? 'demo veri' : 'canlı API',
                color: Colors.white.withValues(alpha: 0.12),
                textColor: Colors.white,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _money(balance),
            style: theme.textTheme.displaySmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              letterSpacing: -1.2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Banka hareketleri ve veresiye akışı birlikte takipte.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.72),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _HeroStat(
                  label: 'Açık hareket',
                  value: '${snapshot.openCount}',
                ),
              ),
              Container(
                width: 1,
                height: 34,
                color: Colors.white.withValues(alpha: 0.18),
              ),
              Expanded(
                child: _HeroStat(
                  label: 'Gelen tutar',
                  value: _money(snapshot.inboundTotal),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.62),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: theme.textTheme.titleMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MarketOverview extends StatelessWidget {
  const _MarketOverview({required this.snapshot});

  final _DashboardSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final rates = snapshot.marketRates;
    final source = snapshot.rates?.demo == true
        ? 'demo'
        : snapshot.rates?.source ?? 'api.finatura.app';
    final fetchedAt = snapshot.rates?.fetchedAt;

    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: _finaturaGold.withValues(alpha: 0.42)),
        boxShadow: [
          BoxShadow(
            color: _finaturaGreen.withValues(alpha: 0.06),
            blurRadius: 22,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: _finaturaGold.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.currency_exchange_rounded,
                  color: _finaturaGreen,
                  size: 21,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Piyasa özeti',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: _finaturaGreen,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${fetchedAt == null ? 'Canlı kur' : _time(fetchedAt)} · $source',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              _Pill(
                label: snapshot.rates?.stale == true ? 'önbellek' : 'canlı',
                color: _finaturaGreen.withValues(alpha: 0.09),
                textColor: _finaturaGreen,
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 118,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: rates.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                return _MarketRateTile(rate: rates[index]);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _MarketRateTile extends StatelessWidget {
  const _MarketRateTile({required this.rate});

  final MarketRate rate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final positive = (rate.changePercent ?? 0) >= 0;
    final changeColor = positive ? const Color(0xFF15803D) : scheme.error;

    return Container(
      width: 166,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  rate.symbol,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: _finaturaGreen,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Text(
                _rateChange(rate.changePercent),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: changeColor,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            rate.label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          const Spacer(),
          Row(
            children: [
              Expanded(
                child: _RatePrice(label: 'Alış', value: _rate(rate.bid)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _RatePrice(label: 'Satış', value: _rate(rate.ask)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RatePrice extends StatelessWidget {
  const _RatePrice({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w900,
              letterSpacing: -0.2,
            ),
          ),
        ),
      ],
    );
  }
}

class _ActionShortcuts extends StatelessWidget {
  const _ActionShortcuts();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hızlı işlemler',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 10),
        const SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _ShortcutChip(
                icon: Icons.document_scanner_outlined,
                label: 'Tara',
              ),
              SizedBox(width: 10),
              _ShortcutChip(
                icon: Icons.account_balance_outlined,
                label: 'Mutabakat',
              ),
              SizedBox(width: 10),
              _ShortcutChip(
                icon: Icons.receipt_long_outlined,
                label: 'E-fatura',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ShortcutChip extends StatelessWidget {
  const _ShortcutChip({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 19, color: _finaturaGreen),
          const SizedBox(width: 8),
          Text(
            label,
            style: theme.textTheme.labelLarge?.copyWith(
              color: scheme.onSurface,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReceivablePayableGrid extends StatelessWidget {
  const _ReceivablePayableGrid({required this.snapshot});

  final _DashboardSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: _MetricCard(
            icon: Icons.south_west_rounded,
            title: 'Alacak',
            value: _money(snapshot.receivableTotal),
            subtitle: '${snapshot.debts.length} açık öneri',
            accent: _finaturaGreen,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MetricCard(
            icon: Icons.north_east_rounded,
            title: 'Verecek',
            value: _money(snapshot.payableTotal),
            subtitle: snapshot.payableTotal == 0 ? 'Bekleyen yok' : 'Ödenecek',
            accent: _finaturaGold,
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.subtitle,
    required this.accent,
  });

  final IconData icon;
  final String title;
  final String value;
  final String subtitle;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(icon, color: accent, size: 20),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: theme.textTheme.labelLarge?.copyWith(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: theme.textTheme.titleLarge?.copyWith(
                color: scheme.onSurface,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.4,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _RecentTransactionsList extends StatelessWidget {
  const _RecentTransactionsList({required this.transactions});

  final List<BankTransaction> transactions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return _SurfacePanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PanelHeader(
            icon: Icons.history_rounded,
            title: 'Son hareketler',
          ),
          const SizedBox(height: 8),
          if (transactions.isEmpty)
            Text(
              'Henüz gösterilecek açık banka hareketi yok.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            )
          else
            for (final tx in transactions.take(4)) _TransactionRow(tx: tx),
        ],
      ),
    );
  }
}

class _TransactionRow extends StatelessWidget {
  const _TransactionRow({required this.tx});

  final BankTransaction tx;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: scheme.primaryContainer,
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(
              tx.isInbound
                  ? Icons.arrow_downward_rounded
                  : Icons.arrow_upward_rounded,
              color: scheme.onPrimaryContainer,
              size: 21,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx.counterpartyName ?? 'Bilinmeyen gönderen',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${tx.bankAccountAlias} · ${_date(tx.transactionAt)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            '${tx.isInbound ? '+' : '-'}${_money(tx.amount)}',
            style: theme.textTheme.titleSmall?.copyWith(
              color: tx.isInbound ? _finaturaGreen : scheme.error,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _SurfacePanel extends StatelessWidget {
  const _SurfacePanel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: child,
    );
  }
}

class _PanelHeader extends StatelessWidget {
  const _PanelHeader({
    required this.icon,
    required this.title,
  });

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Icon(icon, color: _finaturaGreen, size: 20),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({
    required this.label,
    required this.color,
    required this.textColor,
  });

  final String label;
  final Color color;
  final Color textColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: textColor,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _DashboardNotice extends StatelessWidget {
  const _DashboardNotice({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _SurfacePanel(
      child: Row(
        children: [
          Icon(Icons.cloud_off_outlined, color: theme.colorScheme.error),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          TextButton(onPressed: onRetry, child: const Text('Tekrar dene')),
        ],
      ),
    );
  }
}

String _cleanOr(String? value, String fallback) {
  final trimmed = value?.trim();
  return trimmed == null || trimmed.isEmpty ? fallback : trimmed;
}

String _firstName(String displayName) {
  final parts = displayName.trim().split(RegExp(r'\s+'));
  return parts.isEmpty ? displayName : parts.first;
}

String _money(double amount) {
  final fixed =
      amount % 1 == 0 ? amount.toStringAsFixed(0) : amount.toStringAsFixed(2);
  return '₺$fixed';
}

String _rate(double value) {
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

String _rateChange(double? value) {
  if (value == null) return '-';
  final sign = value > 0 ? '+' : '';
  return '$sign${value.toStringAsFixed(2)}%';
}

String _time(DateTime at) {
  final hour = at.hour.toString().padLeft(2, '0');
  final minute = at.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}

String _date(DateTime at) {
  final day = at.day.toString().padLeft(2, '0');
  final month = at.month.toString().padLeft(2, '0');
  final hour = at.hour.toString().padLeft(2, '0');
  final minute = at.minute.toString().padLeft(2, '0');
  return '$day.$month $hour:$minute';
}

import 'package:flutter/material.dart';
import 'package:finatura_mobile/features/auth/services/auth_controller.dart';

import '../config/settlement_api_config.dart';
import '../data/settlement_repository.dart';
import '../models/bank_transaction.dart';
import '../models/settlement_action.dart';
import '../models/veresiye_open_debt.dart';
import 'widgets/bank_transaction_tile.dart';
import 'widgets/settle_match_sheet.dart';

/// Eşleşmemiş gelen banka hareketleri — swipe / tek tık veresiye kapatma girişi.
///
/// Veri: Gateway → tenant-router. Mock yalnızca `SETTLEMENT_ALLOW_MOCK=true`.
class SettlementInboxScreen extends StatefulWidget {
  const SettlementInboxScreen({
    super.key,
    this.auth,
    this.repository,
  });

  static const routeName = '/settlement';

  final AuthController? auth;
  final SettlementRepository? repository;

  @override
  State<SettlementInboxScreen> createState() => _SettlementInboxScreenState();
}

class _SettlementInboxScreenState extends State<SettlementInboxScreen> {
  SettlementRepository? _ownedRepo;
  List<BankTransaction> _inbox = [];
  final List<SettlementAction> _history = [];
  bool _loading = true;
  String? _error;

  SettlementRepository? get _repo {
    if (widget.repository != null) return widget.repository;
    return _ownedRepo;
  }

  bool get _usingMock => SettlementApiConfig.allowMock;

  @override
  void initState() {
    super.initState();
    _bootstrapRepo();
    _loadInbox();
  }

  void _bootstrapRepo() {
    if (widget.repository != null) return;
    final session = widget.auth?.session;
    _ownedRepo = SettlementRepository(
      accessToken: session?.accessToken ?? '',
      tenantId: session?.user.tenantId ?? '',
      allowMock: SettlementApiConfig.allowMock,
    );
  }

  Future<void> _loadInbox() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final repo = _repo;
    if (repo == null) {
      setState(() {
        _loading = false;
        _inbox = [];
        _error = 'Oturum veya API istemcisi hazır değil.';
      });
      return;
    }

    try {
      final items = await repo.fetchInboundUnmatched();
      if (!mounted) return;
      setState(() {
        _inbox = items.where((tx) => tx.isOpen).toList();
        _loading = false;
        _error = null;
      });
    } on SettlementException catch (e) {
      if (!mounted) return;
      setState(() {
        _inbox = [];
        _loading = false;
        _error = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _inbox = [];
        _loading = false;
        _error = 'Beklenmeyen hata: $e';
      });
    }
  }

  Future<void> _openMatchSheet(BankTransaction tx) async {
    final repo = _repo;
    if (repo == null) return;

    late final List<VeresiyeOpenDebt> candidates;
    try {
      candidates = await repo.fetchMatchSuggestions(tx.id);
    } on SettlementException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (!mounted) return;
    await SettleMatchSheet.show(
      context: context,
      bankTx: tx,
      candidates: candidates,
      onSettle: _applySettlement,
    );
  }

  Future<void> _applySettlement(SettlementAction action) async {
    final repo = _repo;
    if (repo == null) return;

    try {
      final settled = await repo.settle(action);
      if (!mounted) return;
      setState(() {
        _history.insert(0, settled);
        _inbox = _inbox
            .map(
              (tx) => tx.id == settled.bankTx.id
                  ? tx.copyWith(
                      matchStatus: BankTxMatchStatus.matched,
                      matchedCariId: settled.veresiye.cariId,
                      matchedVeresiyeId: settled.veresiye.id,
                    )
                  : tx,
            )
            .where((tx) => tx.isOpen)
            .toList();
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${settled.veresiye.cariTitle} veresiyesine mahsup edildi '
            '(₺${settled.settleAmount.toStringAsFixed(0)}).',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } on SettlementException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          behavior: SnackBarBehavior.floating,
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  @override
  void dispose() {
    _ownedRepo?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Banka · Veresiye'),
        actions: [
          IconButton(
            tooltip: 'Yenile',
            onPressed: _loading ? null : _loadInbox,
            icon: const Icon(Icons.refresh),
          ),
          if (_history.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Text(
                  '${_history.length} mahsup',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: _buildBody(theme),
    );
  }

  Widget _buildBody(ThemeData theme) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return _ErrorState(
        message: _error!,
        onRetry: _loadInbox,
      );
    }

    if (_inbox.isEmpty) {
      return _EmptyState(
        recentCount: _history.length,
        usedMock: _usingMock,
      );
    }

    return ListView.separated(
      itemCount: _inbox.length + 1,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              _usingMock
                  ? 'DEBUG mock — gelen havaleler'
                  : 'Gelen havaleler — tıkla, kaydır, kapat',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          );
        }
        final tx = _inbox[index - 1];
        return BankTransactionTile(
          tx: tx,
          onTap: () => _openMatchSheet(tx),
        );
      },
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.cloud_off_outlined,
              size: 48,
              color: theme.colorScheme.error,
            ),
            const SizedBox(height: 12),
            Text(
              'Banka hareketleri yüklenemedi',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
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

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.recentCount,
    required this.usedMock,
  });

  final int recentCount;
  final bool usedMock;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.done_all_rounded,
              size: 48,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: 12),
            Text(
              'Eşleşecek hareket kalmadı',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              recentCount > 0
                  ? 'Bu oturumda $recentCount mahsup yapıldı.'
                  : usedMock
                      ? 'Mock gelen havaleler listesi boş.'
                      : 'Eşleşmemiş gelen havale yok.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

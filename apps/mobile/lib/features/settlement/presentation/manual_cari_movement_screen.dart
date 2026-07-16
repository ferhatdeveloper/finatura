import 'package:flutter/material.dart';
import 'package:finatura_mobile/features/auth/services/auth_controller.dart';

import '../config/settlement_api_config.dart';
import '../data/settlement_repository.dart';
import '../models/manual_cari_movement.dart';

const _finaturaGreen = Color(0xFF123C31);
const _finaturaGold = Color(0xFFD6A84F);

class ManualCariMovementScreen extends StatefulWidget {
  const ManualCariMovementScreen({
    super.key,
    this.auth,
    this.repository,
    this.prefill,
  });

  static const routeName = '/settlement/manual-cari';

  final AuthController? auth;
  final SettlementRepository? repository;
  final ManualCariMovementPrefill? prefill;

  @override
  State<ManualCariMovementScreen> createState() =>
      _ManualCariMovementScreenState();
}

class _ManualCariMovementScreenState extends State<ManualCariMovementScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _goldGramsController = TextEditingController();
  final _goldPurityController = TextEditingController();
  final _fxRateController = TextEditingController();

  SettlementRepository? _ownedRepo;
  List<ManualCariOption> _caris = const [];
  ManualCariOption? _selectedCari;
  ManualCariOperation _operation = ManualCariOperation.tahsilat;
  ManualCariAssetKind _assetKind = ManualCariAssetKind.tl;
  String _currencyCode = 'TRY';
  bool _loading = true;
  bool _saving = false;
  String? _error;

  SettlementRepository? get _repo => widget.repository ?? _ownedRepo;

  @override
  void initState() {
    super.initState();
    _bootstrapRepo();
    _applyPrefill();
    _loadCaris();
  }

  void _bootstrapRepo() {
    if (widget.repository != null) return;
    final session = widget.auth?.session;
    _ownedRepo = SettlementRepository(
      accessToken: session?.accessToken ?? '',
      tenantId: session?.user.tenantId ?? '',
      allowMock: session?.fromMock ?? SettlementApiConfig.allowMock,
    );
  }

  void _applyPrefill() {
    final prefill = widget.prefill;
    if (prefill == null) return;
    _assetKind = prefill.assetKind;
    _currencyCode = prefill.currencyCode;
    if (prefill.amount != null) {
      _amountController.text = _formatPrefillNumber(prefill.amount!);
    }
    if (prefill.goldGrams != null) {
      _goldGramsController.text = _formatPrefillNumber(prefill.goldGrams!);
    }
    if (prefill.goldPurity != null) {
      _goldPurityController.text = _formatPrefillNumber(prefill.goldPurity!);
    }
    if (prefill.fxRate != null) {
      _fxRateController.text = _formatPrefillNumber(prefill.fxRate!);
    }
    _descriptionController.text = prefill.description;
  }

  Future<void> _loadCaris() async {
    final repo = _repo;
    if (repo == null) {
      setState(() {
        _loading = false;
        _error = 'Oturum veya API istemcisi hazır değil.';
      });
      return;
    }

    try {
      final items = await repo.fetchCariOptions();
      if (!mounted) return;
      setState(() {
        _caris = items;
        _selectedCari = items.isNotEmpty ? items.first : null;
        _loading = false;
        _error = null;
      });
    } on SettlementException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.message;
      });
    }
  }

  Future<void> _save() async {
    final repo = _repo;
    if (repo == null || _saving) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final cari = _selectedCari;
    if (cari == null) {
      setState(() => _error = 'Önce cari seçin.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    final request = ManualCariMovementRequest(
      cariId: cari.id,
      operation: _operation,
      assetKind: _assetKind,
      amount: _parseNumber(_amountController.text)!,
      currencyCode: _currencyCode,
      description: _descriptionController.text.trim(),
      goldGrams: _assetKind == ManualCariAssetKind.gold
          ? _parseNumber(_goldGramsController.text)
          : null,
      goldPurity: _assetKind == ManualCariAssetKind.gold
          ? _parseNumber(_goldPurityController.text)
          : null,
      fxRate: _assetKind == ManualCariAssetKind.fx
          ? _parseNumber(_fxRateController.text)
          : null,
    );

    try {
      await repo.createManualCariMovement(request);
      if (!mounted) return;
      _amountController.clear();
      _descriptionController.clear();
      _goldGramsController.clear();
      _goldPurityController.clear();
      _fxRateController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _operation == ManualCariOperation.tahsilat
                ? 'Elden tahsilat kaydedildi.'
                : 'Elden tediye kaydedildi.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } on SettlementException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _ownedRepo?.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    _goldGramsController.dispose();
    _goldPurityController.dispose();
    _fxRateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(
        title: const Text('Elden İşlem'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadCaris,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
                children: [
                  _IntroCard(operation: _operation),
                  const SizedBox(height: 16),
                  if (widget.prefill != null) ...[
                    _PrefillBanner(prefill: widget.prefill!),
                    const SizedBox(height: 12),
                  ],
                  if (_error != null) ...[
                    _ErrorBanner(message: _error!),
                    const SizedBox(height: 12),
                  ],
                  _buildForm(theme),
                ],
              ),
            ),
    );
  }

  Widget _buildForm(ThemeData theme) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SegmentedButton<ManualCariOperation>(
            segments: const [
              ButtonSegment(
                value: ManualCariOperation.tahsilat,
                icon: Icon(Icons.south_west_rounded),
                label: Text('Elden tahsilat'),
              ),
              ButtonSegment(
                value: ManualCariOperation.tediye,
                icon: Icon(Icons.north_east_rounded),
                label: Text('Elden tediye'),
              ),
            ],
            selected: {_operation},
            onSelectionChanged: (values) {
              setState(() => _operation = values.first);
            },
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<ManualCariOption>(
            key: const ValueKey('manualCariSelector'),
            initialValue: _selectedCari,
            decoration: const InputDecoration(
              labelText: 'Cari',
              border: OutlineInputBorder(),
            ),
            items: [
              for (final cari in _caris)
                DropdownMenuItem(
                  value: cari,
                  child: Text(cari.title),
                ),
            ],
            onChanged: (value) => setState(() => _selectedCari = value),
            validator: (value) => value == null ? 'Cari seçin' : null,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<ManualCariAssetKind>(
            initialValue: _assetKind,
            decoration: const InputDecoration(
              labelText: 'Varlık',
              border: OutlineInputBorder(),
            ),
            items: const [
              DropdownMenuItem(
                value: ManualCariAssetKind.tl,
                child: Text('TL'),
              ),
              DropdownMenuItem(
                value: ManualCariAssetKind.gold,
                child: Text('Altın'),
              ),
              DropdownMenuItem(
                value: ManualCariAssetKind.fx,
                child: Text('Döviz'),
              ),
            ],
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _assetKind = value;
                _currencyCode = value == ManualCariAssetKind.fx ? 'USD' : 'TRY';
              });
            },
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: TextFormField(
                  key: const ValueKey('manualAmountField'),
                  controller: _amountController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: _assetKind == ManualCariAssetKind.gold
                        ? 'Tutar karşılığı'
                        : 'Tutar',
                    border: const OutlineInputBorder(),
                  ),
                  validator: _positiveValidator,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonFormField<String>(
                  key: ValueKey(_currencyCode),
                  initialValue: _currencyCode,
                  decoration: const InputDecoration(
                    labelText: 'Para',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'TRY', child: Text('TRY')),
                    DropdownMenuItem(value: 'USD', child: Text('USD')),
                    DropdownMenuItem(value: 'EUR', child: Text('EUR')),
                    DropdownMenuItem(value: 'GBP', child: Text('GBP')),
                  ],
                  onChanged: (value) {
                    if (value != null) setState(() => _currencyCode = value);
                  },
                ),
              ),
            ],
          ),
          if (_assetKind == ManualCariAssetKind.gold) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _goldGramsController,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Gram',
                      border: OutlineInputBorder(),
                    ),
                    validator: _positiveValidator,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: _goldPurityController,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Ayar / saflık',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
          ],
          if (_assetKind == ManualCariAssetKind.fx) ...[
            const SizedBox(height: 12),
            TextFormField(
              controller: _fxRateController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Kur',
                border: OutlineInputBorder(),
              ),
            ),
          ],
          const SizedBox(height: 12),
          TextFormField(
            key: const ValueKey('manualDescriptionField'),
            controller: _descriptionController,
            minLines: 2,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Not',
              hintText: 'Örn. elden kapora alındı',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: _saving ? null : _save,
            icon: _saving
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check_rounded),
            label: const Text('Kaydet'),
          ),
          const SizedBox(height: 10),
          Text(
            'Bu kayıt banka hareketi oluşturmaz; mutabakata düşmeden doğrudan cari/veresiye hareketi olarak yazılır.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _PrefillBanner extends StatelessWidget {
  const _PrefillBanner({required this.prefill});

  final ManualCariMovementPrefill prefill;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _finaturaGold.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _finaturaGold.withValues(alpha: 0.36)),
      ),
      child: Row(
        children: [
          const Icon(Icons.currency_exchange_rounded, color: _finaturaGreen),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  prefill.title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: _finaturaGreen,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  prefill.description,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _IntroCard extends StatelessWidget {
  const _IntroCard({required this.operation});

  final ManualCariOperation operation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCollection = operation == ManualCariOperation.tahsilat;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _finaturaGreen,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: _finaturaGreen.withValues(alpha: 0.18),
            blurRadius: 22,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Colors.white.withValues(alpha: 0.12),
            child: Icon(
              isCollection
                  ? Icons.south_west_rounded
                  : Icons.north_east_rounded,
              color: _finaturaGold,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isCollection
                      ? 'Kasaya giren elden para'
                      : 'Kasadan çıkan elden para',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isCollection
                      ? 'Tahsilat cari alacağını kapatır.'
                      : 'Tediye cari borç hareketi olarak işlenir.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.72),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.errorContainer,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        message,
        style: TextStyle(color: scheme.onErrorContainer),
      ),
    );
  }
}

String? _positiveValidator(String? value) {
  final parsed = _parseNumber(value ?? '');
  if (parsed == null || parsed <= 0) return 'Pozitif tutar girin';
  return null;
}

double? _parseNumber(String raw) {
  return double.tryParse(raw.trim().replaceAll(',', '.'));
}

String _formatPrefillNumber(double value) {
  return value.toStringAsFixed(value.truncateToDouble() == value ? 0 : 2);
}

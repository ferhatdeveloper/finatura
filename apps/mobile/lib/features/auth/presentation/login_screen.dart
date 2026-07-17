import 'package:flutter/material.dart';

import '../config/api_config.dart';
import '../services/auth_controller.dart';
import 'register_placeholder_screen.dart';

const _ink = Color(0xFF061510);
const _inkMid = Color(0xFF0B1F1A);
const _emerald = Color(0xFF164036);
const _moss = Color(0xFF2D8A6E);
const _mist = Color(0xFFDCE8E2);
const _paper = Color(0xFFF3F8F5);
const _brass = Color(0xFFD4B56A);
const _brassDeep = Color(0xFFA8873D);
const _brassBright = Color(0xFFE3C87D);
const _text = Color(0xFF13221D);
const _muted = Color(0xFF4A6258);
const _line = Color(0xFFC5D4CC);

/// E-posta, şifre, firma kodu ile SaaS girişi.
/// Dashboard LoginPage ile aynı gece-zümrüt / pirinç marka dili.
class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.auth,
  });

  static const routeName = '/login';

  final AuthController auth;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController(text: ApiConfig.demoEmail);
  final _passwordCtrl = TextEditingController(text: ApiConfig.demoPassword);
  final _firmaCtrl = TextEditingController(text: ApiConfig.demoFirmaKodu);
  bool _obscure = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _firmaCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();

    final ok = await widget.auth.login(
      email: _emailCtrl.text,
      password: _passwordCtrl.text,
      firmaKodu: _firmaCtrl.text,
    );

    if (!mounted) return;
    if (!ok) {
      final msg = widget.auth.error ?? 'Giriş başarısız';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final isWide = size.width >= 860;
    final horizontalPad =
        size.width >= 600 ? 32.0 : (size.width >= 520 ? 16.0 : 12.0);

    return Scaffold(
      backgroundColor: _ink,
      body: Stack(
        fit: StackFit.expand,
        children: [
          const _LoginAtmosphere(),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final shellMinHeight = isWide
                    ? (constraints.maxHeight - 48).clamp(560.0, 720.0)
                    : 0.0;

                return Center(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.symmetric(
                      horizontal: horizontalPad,
                      vertical: 20,
                    ),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        maxWidth: 1040,
                        minHeight: shellMinHeight,
                      ),
                      child: AnimatedBuilder(
                        animation: widget.auth,
                        builder: (context, _) {
                          return _LoginShell(
                            isWide: isWide,
                            minHeight: shellMinHeight,
                            brand: _BrandPanel(compact: !isWide),
                            form: _buildFormCard(widget.auth.busy),
                          );
                        },
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFormCard(bool busy) {
    final hint =
        'Demo: ${ApiConfig.demoEmail} / ${ApiConfig.demoPassword} / ${ApiConfig.demoFirmaKodu}';

    return Form(
      key: _formKey,
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 400),
        padding: const EdgeInsets.fromLTRB(26, 28, 26, 20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.white, _paper],
          ),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: _brass.withValues(alpha: 0.38)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x4D000000),
              blurRadius: 70,
              offset: Offset(0, 24),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            const _FinaturaLogo(size: 30, dark: true),
            const SizedBox(height: 18),
            const Text(
              'GÜVENLİ GİRİŞ',
              style: TextStyle(
                color: _brassDeep,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.8,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Operasyon paneli',
              style: TextStyle(
                color: _inkMid,
                fontSize: 26,
                fontWeight: FontWeight.w800,
                letterSpacing: -1.1,
                height: 1.08,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Firma kodunuzla doğru çalışma alanına bağlanın.',
              style: TextStyle(
                color: _muted,
                fontSize: 14.5,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 22),
            _LabeledField(
              label: 'E-posta',
              child: TextFormField(
                controller: _emailCtrl,
                enabled: !busy,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: TextInputAction.next,
                style: const TextStyle(
                  color: _text,
                  fontWeight: FontWeight.w500,
                ),
                decoration: _inputDecoration(),
                validator: (v) {
                  final value = v?.trim() ?? '';
                  if (value.isEmpty) return 'E-posta gerekli';
                  if (!value.contains('@')) return 'Geçerli bir e-posta girin';
                  return null;
                },
              ),
            ),
            const SizedBox(height: 14),
            _LabeledField(
              label: 'Şifre',
              child: TextFormField(
                controller: _passwordCtrl,
                enabled: !busy,
                obscureText: _obscure,
                autofillHints: const [AutofillHints.password],
                textInputAction: TextInputAction.next,
                style: const TextStyle(
                  color: _text,
                  fontWeight: FontWeight.w500,
                ),
                decoration: _inputDecoration(
                  suffixIcon: IconButton(
                    onPressed: busy
                        ? null
                        : () => setState(() => _obscure = !_obscure),
                    icon: Icon(
                      _obscure
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      color: _muted,
                      size: 20,
                    ),
                  ),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Şifre gerekli';
                  return null;
                },
              ),
            ),
            const SizedBox(height: 14),
            _LabeledField(
              label: 'Firma kodu',
              child: TextFormField(
                controller: _firmaCtrl,
                enabled: !busy,
                textCapitalization: TextCapitalization.characters,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => busy ? null : _submit(),
                style: const TextStyle(
                  color: _text,
                  fontWeight: FontWeight.w500,
                ),
                decoration: _inputDecoration(hint: 'ör. ornek'),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Firma kodu gerekli';
                  }
                  return null;
                },
              ),
            ),
            const SizedBox(height: 22),
            _GoldSubmitButton(busy: busy, onPressed: _submit),
            const SizedBox(height: 14),
            Text(
              hint,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: _muted,
                fontSize: 12,
                height: 1.4,
              ),
            ),
            TextButton(
              onPressed: busy
                  ? null
                  : () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const RegisterPlaceholderScreen(),
                        ),
                      );
                    },
              style: TextButton.styleFrom(
                foregroundColor: _emerald,
                textStyle: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              child: const Text('Hesap oluştur'),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({String? hint, Widget? suffixIcon}) {
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: _line),
    );

    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: _muted.withValues(alpha: 0.7)),
      filled: true,
      fillColor: Colors.white,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      suffixIcon: suffixIcon,
      border: border,
      enabledBorder: border,
      focusedBorder: border.copyWith(
        borderSide: const BorderSide(color: _moss, width: 1.5),
      ),
      errorBorder: border.copyWith(
        borderSide: const BorderSide(color: Color(0xFF8B2E2E)),
      ),
    );
  }
}

class _GoldSubmitButton extends StatelessWidget {
  const _GoldSubmitButton({
    required this.busy,
    required this.onPressed,
  });

  final bool busy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 50,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: busy
                ? [
                    _brass.withValues(alpha: 0.55),
                    _brassBright.withValues(alpha: 0.55),
                  ]
                : const [_brass, _brassBright],
          ),
          boxShadow: [
            BoxShadow(
              color: _brassDeep.withValues(alpha: 0.22),
              blurRadius: 32,
              offset: const Offset(0, 14),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: busy ? null : onPressed,
            borderRadius: BorderRadius.circular(10),
            child: Center(
              child: busy
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: _inkMid,
                      ),
                    )
                  : const Text(
                      'Giriş yap',
                      style: TextStyle(
                        color: _inkMid,
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoginShell extends StatelessWidget {
  const _LoginShell({
    required this.isWide,
    required this.minHeight,
    required this.brand,
    required this.form,
  });

  final bool isWide;
  final double minHeight;
  final Widget brand;
  final Widget form;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: _brass.withValues(alpha: 0.2)),
        color: const Color(0x9E071612),
        boxShadow: const [
          BoxShadow(
            color: Color(0x6B000000),
            blurRadius: 90,
            offset: Offset(0, 34),
          ),
        ],
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: minHeight),
        child: isWide
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 108, child: brand),
                  Expanded(
                    flex: 82,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 36, 28, 36),
                      child: Align(
                        alignment: Alignment.center,
                        child: form,
                      ),
                    ),
                  ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  brand,
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 20),
                    child: form,
                  ),
                ],
              ),
      ),
    );
  }
}

class _LoginAtmosphere extends StatelessWidget {
  const _LoginAtmosphere();

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(-0.8, -1),
              end: Alignment(0.9, 1),
              colors: [_ink, _inkMid, _emerald, Color(0xFF0E2A22)],
              stops: [0, 0.4, 0.78, 1],
            ),
          ),
        ),
        Positioned(
          left: -80,
          top: -40,
          child: _Glow(size: 420, color: _moss, opacity: 0.34),
        ),
        Positioned(
          right: -60,
          top: 40,
          child: _Glow(size: 320, color: _brass, opacity: 0.18),
        ),
        Positioned(
          right: -40,
          bottom: -80,
          child: _Glow(
            size: 300,
            color: const Color(0xFF083229),
            opacity: 0.85,
          ),
        ),
        const CustomPaint(painter: _TexturePainter()),
      ],
    );
  }
}

class _Glow extends StatelessWidget {
  const _Glow({
    required this.size,
    required this.color,
    required this.opacity,
  });

  final double size;
  final Color color;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [
            color.withValues(alpha: opacity),
            color.withValues(alpha: 0),
          ],
        ),
      ),
    );
  }
}

class _BrandPanel extends StatelessWidget {
  const _BrandPanel({this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: compact ? null : 640,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            right: compact ? -36 : 28,
            top: compact ? 12 : 56,
            child: IgnorePointer(
              child: Container(
                width: compact ? 200 : 340,
                height: compact ? 200 : 340,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: _brass.withValues(alpha: 0.28),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: _moss.withValues(alpha: 0.16),
                      blurRadius: 80,
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            right: -70,
            bottom: -80,
            child: IgnorePointer(
              child: _Glow(size: 260, color: _brass, opacity: 0.12),
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              compact ? 18 : 48,
              compact ? 28 : 40,
              compact ? 18 : 36,
              compact ? 24 : 40,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _FinaturaLogo(size: compact ? 48 : 76),
                if (!compact) const Spacer(),
                if (compact) const SizedBox(height: 32),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: _brass.withValues(alpha: 0.28),
                    ),
                  ),
                  child: const Text(
                    'ESNAF MALİ OPERASYON MERKEZİ',
                    style: TextStyle(
                      color: _brass,
                      fontWeight: FontWeight.w700,
                      fontSize: 11.5,
                      letterSpacing: 1.6,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Belgeler, banka ve e-Fatura tek gece panelinde.',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: compact ? 28 : 40,
                    letterSpacing: -1.8,
                    height: 0.98,
                    shadows: const [
                      Shadow(
                        color: Color(0x57000000),
                        offset: Offset(0, 14),
                        blurRadius: 36,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Galeri, kuyumcu ve emlak ekipleri için evrak akışını sakin, izlenebilir ve hızlı tutan operasyon ekranı.',
                  style: TextStyle(
                    color: const Color(0xE0EEF6F2),
                    height: 1.45,
                    fontSize: compact ? 14 : 16.5,
                  ),
                ),
                const SizedBox(height: 22),
                const Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _ProofChip(label: 'OCR'),
                    _ProofChip(label: 'Banka mutabakat'),
                    _ProofChip(label: 'e-Fatura'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FinaturaLogo extends StatelessWidget {
  const _FinaturaLogo({
    required this.size,
    this.dark = false,
  });

  final double size;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return RichText(
      text: TextSpan(
        style: TextStyle(
          color: dark ? _inkMid : Colors.white,
          fontSize: size,
          fontWeight: FontWeight.w800,
          height: 0.95,
          letterSpacing: -size * 0.07,
          shadows: dark
              ? null
              : const [
                  Shadow(
                    color: Color(0x66000000),
                    offset: Offset(0, 18),
                    blurRadius: 42,
                  ),
                ],
        ),
        children: const [
          TextSpan(text: 'Finatur'),
          TextSpan(text: 'a', style: TextStyle(color: _brass)),
        ],
      ),
    );
  }
}

class _ProofChip extends StatelessWidget {
  const _ProofChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.07),
        border: Border.all(color: _mist.withValues(alpha: 0.22)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xE0EEF6F2),
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({
    required this.label,
    required this.child,
  });

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: _muted,
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }
}

class _TexturePainter extends CustomPainter {
  const _TexturePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = _brass.withValues(alpha: 0.045)
      ..strokeWidth = 1;
    for (var x = -size.width; x < size.width * 1.6; x += 56) {
      canvas.drawLine(
        Offset(x, size.height + 40),
        Offset(x + size.width * 0.72, -40),
        linePaint,
      );
    }

    final speckPaint = Paint()..color = Colors.white.withValues(alpha: 0.03);
    for (var i = 0; i < 140; i++) {
      final dx = ((i * 47) % (size.width + 80)) - 40;
      final dy = ((i * 83) % (size.height + 80)) - 40;
      canvas.drawCircle(Offset(dx, dy), i.isEven ? 0.7 : 0.45, speckPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

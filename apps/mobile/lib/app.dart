import 'package:flutter/material.dart';
import 'package:finatura_mobile/features/auth/auth.dart';
import 'package:finatura_mobile/features/rates/rates.dart';
import 'package:finatura_mobile/features/scan/scan.dart';
import 'package:finatura_mobile/features/settlement/settlement.dart';
import 'package:finatura_mobile/features/shell/shell.dart';

/// Finatura ürün çatısı — route map + auth kapısı + shell.
///
/// ```
/// /login              → LoginScreen          (auth)
/// /register           → RegisterPlaceholder  (auth)
/// /app                → AppShell             (shell)
/// /home               → HomeSummaryScreen
/// /scan               → DocumentScanScreen
/// /settlement         → SettlementInboxScreen
/// /settlement/manual-cari → ManualCariMovementScreen
/// /rates              → MarketRatesScreen
/// /e-invoice          → EInvoiceStubScreen
/// /account            → AccountScreen
/// ```
class FinaturaApp extends StatefulWidget {
  const FinaturaApp({super.key, this.auth});

  /// Test enjeksiyonu; null ise varsayılan [AuthController].
  final AuthController? auth;

  @override
  State<FinaturaApp> createState() => _FinaturaAppState();
}

class _FinaturaAppState extends State<FinaturaApp> {
  late final AuthController _auth;
  late final bool _ownsAuth;

  @override
  void initState() {
    super.initState();
    _ownsAuth = widget.auth == null;
    _auth = widget.auth ?? AuthController();
    _auth.bootstrap();
  }

  @override
  void dispose() {
    if (_ownsAuth) {
      _auth.dispose();
    }
    super.dispose();
  }

  Future<void> _logout() async {
    await _auth.logout();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Finatura',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1B4D3E),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      home: AuthGate(
        auth: _auth,
        home: AnimatedBuilder(
          animation: _auth,
          builder: (context, _) {
            final user = _auth.session?.user;
            return AppShell(
              auth: _auth,
              displayName: user?.displayName,
              email: user?.email,
              onLogout: _logout,
            );
          },
        ),
      ),
      routes: {
        LoginScreen.routeName: (_) => LoginScreen(auth: _auth),
        RegisterPlaceholderScreen.routeName: (_) =>
            const RegisterPlaceholderScreen(),
        AppShell.routeName: (_) => AnimatedBuilder(
              animation: _auth,
              builder: (context, _) {
                final user = _auth.session?.user;
                return AppShell(
                  auth: _auth,
                  displayName: user?.displayName,
                  email: user?.email,
                  onLogout: _logout,
                );
              },
            ),
        HomeSummaryScreen.routeName: (_) => HomeSummaryScreen(auth: _auth),
        DocumentScanScreen.routeName: (_) => const DocumentScanScreen(),
        SettlementInboxScreen.routeName: (_) =>
            SettlementInboxScreen(auth: _auth),
        ManualCariMovementScreen.routeName: (_) =>
            ManualCariMovementScreen(auth: _auth),
        MarketRatesScreen.routeName: (_) => MarketRatesScreen(auth: _auth),
        EInvoiceStubScreen.routeName: (_) => const EInvoiceStubScreen(),
        AccountScreen.routeName: (_) => AnimatedBuilder(
              animation: _auth,
              builder: (context, _) {
                final user = _auth.session?.user;
                return AccountScreen(
                  displayName: user?.displayName,
                  email: user?.email,
                  onLogout: _logout,
                );
              },
            ),
      },
    );
  }
}

import 'package:flutter/material.dart';
import 'package:finatura_mobile/features/auth/services/auth_controller.dart';
import 'package:finatura_mobile/features/scan/scan.dart';
import 'package:finatura_mobile/features/settlement/settlement.dart';

import 'account_screen.dart';
import 'e_invoice_stub_screen.dart';
import 'home_summary_screen.dart';

/// Tek shell — geniş yüzeyde [NavigationRail], dar yüzeyde alt nav.
class AppShell extends StatefulWidget {
  const AppShell({
    super.key,
    this.auth,
    this.displayName,
    this.email,
    this.onLogout,
    this.initialIndex = 0,
  });

  static const routeName = '/app';

  /// NavRail eşiği (logical px).
  static const double wideBreakpoint = 840;

  final AuthController? auth;
  final String? displayName;
  final String? email;
  final VoidCallback? onLogout;
  final int initialIndex;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  late int _index;

  static const _destinations = <_ShellDestination>[
    _ShellDestination(
      label: 'Ana',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
    ),
    _ShellDestination(
      label: 'Tara',
      icon: Icons.document_scanner_outlined,
      selectedIcon: Icons.document_scanner,
    ),
    _ShellDestination(
      label: 'Mutabakat',
      icon: Icons.account_balance_outlined,
      selectedIcon: Icons.account_balance,
    ),
    _ShellDestination(
      label: 'E-fatura',
      icon: Icons.receipt_long_outlined,
      selectedIcon: Icons.receipt_long,
    ),
    _ShellDestination(
      label: 'Hesap',
      icon: Icons.person_outline,
      selectedIcon: Icons.person,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex.clamp(0, _destinations.length - 1);
  }

  void _select(int value) {
    if (value == _index) return;
    setState(() => _index = value);
  }

  @override
  Widget build(BuildContext context) {
    final wide =
        MediaQuery.sizeOf(context).width >= AppShell.wideBreakpoint;

    final pages = <Widget>[
      const HomeSummaryScreen(),
      const DocumentScanScreen(),
      SettlementInboxScreen(auth: widget.auth),
      const EInvoiceStubScreen(),
      AccountScreen(
        displayName: widget.displayName,
        email: widget.email,
        onLogout: widget.onLogout,
      ),
    ];

    final body = IndexedStack(index: _index, children: pages);

    if (wide) {
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              selectedIndex: _index,
              onDestinationSelected: _select,
              labelType: NavigationRailLabelType.all,
              leading: Padding(
                padding: const EdgeInsets.only(bottom: 8, top: 12),
                child: Text(
                  'Finatura',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                ),
              ),
              destinations: [
                for (final d in _destinations)
                  NavigationRailDestination(
                    icon: Icon(d.icon),
                    selectedIcon: Icon(d.selectedIcon),
                    label: Text(d.label),
                  ),
              ],
            ),
            const VerticalDivider(width: 1),
            Expanded(child: body),
          ],
        ),
      );
    }

    return Scaffold(
      body: body,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _select,
        destinations: [
          for (final d in _destinations)
            NavigationDestination(
              icon: Icon(d.icon),
              selectedIcon: Icon(d.selectedIcon),
              label: d.label,
            ),
        ],
      ),
    );
  }
}

class _ShellDestination {
  const _ShellDestination({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

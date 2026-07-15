import 'package:flutter/material.dart';

import '../services/auth_controller.dart';
import 'login_screen.dart';

/// Cold start: token varsa [home], yoksa [LoginScreen].
class AuthGate extends StatelessWidget {
  const AuthGate({
    super.key,
    required this.auth,
    required this.home,
  });

  final AuthController auth;
  final Widget home;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: auth,
      builder: (context, _) {
        if (!auth.ready) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (auth.isAuthenticated) {
          return home;
        }
        return LoginScreen(auth: auth);
      },
    );
  }
}

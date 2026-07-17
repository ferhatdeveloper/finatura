import 'package:flutter_test/flutter_test.dart';
import 'package:finatura_mobile/app.dart';
import 'package:finatura_mobile/features/auth/auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('FinaturaApp shows login when unauthenticated', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final auth = AuthController();
    await auth.bootstrap();

    await tester.pumpWidget(FinaturaApp(auth: auth));
    await tester.pumpAndSettle();

    expect(find.byType(FinaturaApp), findsOneWidget);
    expect(find.text('Giriş yap'), findsOneWidget);
    expect(find.text('Firma kodu'), findsOneWidget);
  });
}

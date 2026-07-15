import 'package:flutter_test/flutter_test.dart';
import 'package:finatura_mobile/main.dart';

void main() {
  testWidgets('FinaturaApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const FinaturaApp());
    expect(find.byType(FinaturaApp), findsOneWidget);
  });
}

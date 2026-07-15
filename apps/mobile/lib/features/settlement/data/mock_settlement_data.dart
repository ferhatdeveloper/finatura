import '../models/bank_transaction.dart';
import '../models/veresiye_open_debt.dart';

/// Swipe-to-settle iskeleti için örnek banka + veresiye verisi.
class MockSettlementData {
  MockSettlementData._();

  static final List<BankTransaction> inboundUnmatched = [
    BankTransaction(
      id: 'btx-001',
      bankAccountAlias: 'Garanti İşletme',
      direction: BankTxDirection.inbound,
      amount: 185000,
      currencyCode: 'TRY',
      transactionAt: DateTime(2026, 7, 14, 11, 22),
      matchStatus: BankTxMatchStatus.unmatched,
      counterpartyName: 'AHMET YILMAZ',
      description: '34 ABC 123 kapora / AHMET YILMAZ',
    ),
    BankTransaction(
      id: 'btx-002',
      bankAccountAlias: 'Yapı Kredi TL',
      direction: BankTxDirection.inbound,
      amount: 42500.50,
      currencyCode: 'TRY',
      transactionAt: DateTime(2026, 7, 13, 16, 5),
      matchStatus: BankTxMatchStatus.unmatched,
      counterpartyName: 'SELİN KARACA',
      description: 'Ada 412 Parsel 7 bakiye',
    ),
    BankTransaction(
      id: 'btx-003',
      bankAccountAlias: 'Garanti İşletme',
      direction: BankTxDirection.inbound,
      amount: 98000,
      currencyCode: 'TRY',
      transactionAt: DateTime(2026, 7, 12, 9, 40),
      matchStatus: BankTxMatchStatus.unmatched,
      counterpartyName: 'ALTIN HAS TAKAS',
      description: 'Has 12.40 gr karşılığı havale',
    ),
  ];

  /// Banka hareketi id → önerilen açık veresiyeler (skorlu).
  static Map<String, List<VeresiyeOpenDebt>> suggestionsFor = {
    'btx-001': [
      VeresiyeOpenDebt(
        id: 'ver-101',
        cariId: 'cari-ay',
        cariTitle: 'Ahmet Yılmaz',
        assetKind: VeresiyeAssetKind.tl,
        direction: VeresiyeDirection.debit,
        openAmount: 185000,
        currencyCode: 'TRY',
        transactionDate: DateTime(2026, 7, 10),
        description: '34 ABC 123 araç satış bakiyesi',
        matchScore: 96,
        matchHint: 'Plaka + isim eşleşti',
      ),
      VeresiyeOpenDebt(
        id: 'ver-102',
        cariId: 'cari-ay',
        cariTitle: 'Ahmet Yılmaz',
        assetKind: VeresiyeAssetKind.tl,
        direction: VeresiyeDirection.debit,
        openAmount: 25000,
        currencyCode: 'TRY',
        transactionDate: DateTime(2026, 6, 2),
        description: 'Eski dönem bakiyesi',
        matchScore: 41,
        matchHint: 'Aynı cari, tutar uyumsuz',
      ),
    ],
    'btx-002': [
      VeresiyeOpenDebt(
        id: 'ver-201',
        cariId: 'cari-sk',
        cariTitle: 'Selin Karaca',
        assetKind: VeresiyeAssetKind.tl,
        direction: VeresiyeDirection.debit,
        openAmount: 45000,
        currencyCode: 'TRY',
        transactionDate: DateTime(2026, 7, 8),
        description: 'Ada 412 / Parsel 7 yer gösterme sonrası bakiye',
        matchScore: 88,
        matchHint: 'Ada/parsel + tutar yakın',
      ),
    ],
    'btx-003': [
      VeresiyeOpenDebt(
        id: 'ver-301',
        cariId: 'cari-has',
        cariTitle: 'Has Altın Cari',
        assetKind: VeresiyeAssetKind.gold,
        direction: VeresiyeDirection.debit,
        openAmount: 98000,
        currencyCode: 'TRY',
        goldGrams: 12.40,
        transactionDate: DateTime(2026, 7, 11),
        description: '12.40 gr has borç',
        matchScore: 91,
        matchHint: 'Gram + tutar eşleşti',
      ),
    ],
  };

  static List<VeresiyeOpenDebt> suggestionsForTx(String bankTxId) {
    return List<VeresiyeOpenDebt>.from(suggestionsFor[bankTxId] ?? const []);
  }
}

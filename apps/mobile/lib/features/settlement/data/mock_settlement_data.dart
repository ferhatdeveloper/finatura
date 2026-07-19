import '../models/bank_transaction.dart';
import '../models/manual_cari_movement.dart';
import '../models/veresiye_open_debt.dart';

/// Debug-only örnek veri — üretim yolunda kullanılmaz.
///
/// Açmak: `--dart-define=SETTLEMENT_ALLOW_MOCK=true`
/// (bkz. [SettlementApiConfig.allowMock]). API hatasında sessiz doldurma yok.
class MockSettlementData {
  MockSettlementData._();

  static const List<ManualCariOption> cariOptions = [
    ManualCariOption(
      id: 'cari-ay',
      title: 'Ahmet Yılmaz',
      code: 'AY-001',
      openBalance: 185000,
    ),
    ManualCariOption(
      id: 'cari-sk',
      title: 'Selin Karaca',
      code: 'SK-002',
      openBalance: 42500.50,
    ),
    ManualCariOption(
      id: 'cari-has',
      title: 'Has Altın Cari',
      code: 'HAS-003',
      openBalance: 98000,
    ),
  ];

  /// TR banka örnekleri — finteo-agent/fixtures/bank-transactions.tr.json
    /// TR banka örnekleri — finteo-agent/fixtures/bank-transactions.tr.json
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
      description:
          'HAVALE/EFT GELEN 34 ABC 123 ARAC BEDELI GONDEREN: AHMET YILMAZ TCKN:10000000146',
    ),
    BankTransaction(
      id: 'btx-002',
      bankAccountAlias: 'Yapı Kredi TL',
      direction: BankTxDirection.inbound,
      amount: 42500.50,
      currencyCode: 'TRY',
      transactionAt: DateTime(2026, 7, 13, 16, 5),
      matchStatus: BankTxMatchStatus.unmatched,
      counterpartyName: 'SELIN KARACA',
      description: 'EFT GELEN ADA 412 PARSEL 7 KAPORA / SELIN KARACA',
    ),
    BankTransaction(
      id: 'btx-003',
      bankAccountAlias: 'Garanti İşletme',
      direction: BankTxDirection.inbound,
      amount: 98000,
      currencyCode: 'TRY',
      transactionAt: DateTime(2026, 7, 12, 9, 40),
      matchStatus: BankTxMatchStatus.unmatched,
      counterpartyName: 'HAS ALTIN TAKAS',
      description: 'HAVALE GELEN HAS 12,40 GR KARSILIGI / HAS ALTIN TAKAS',
    ),
    BankTransaction(
      id: 'btx-005',
      bankAccountAlias: 'Ziraat TL',
      direction: BankTxDirection.inbound,
      amount: 250000,
      currencyCode: 'TRY',
      transactionAt: DateTime(2026, 7, 14, 12),
      matchStatus: BankTxMatchStatus.unmatched,
      counterpartyName: 'ORNEK FILO KIRALAMA A.S.',
      description:
          'GELEN EFT VKN 1234567890 ORNEK FILO KIRALAMA A.S. FATURA BEDELI',
    ),
    BankTransaction(
      id: 'btx-006',
      bankAccountAlias: 'Garanti İşletme',
      direction: BankTxDirection.inbound,
      amount: 50000,
      currencyCode: 'TRY',
      transactionAt: DateTime(2026, 7, 14, 13, 10),
      matchStatus: BankTxMatchStatus.unmatched,
      counterpartyName: 'AHMET YILMAZ',
      description:
          'HAVALE/EFT 34 ABC 123 KALAN BAKİYE GONDEREN AHMET YILMAZ',
    ),
    BankTransaction(
      id: 'btx-007',
      bankAccountAlias: 'Yapı Kredi TL',
      direction: BankTxDirection.inbound,
      amount: 1500,
      currencyCode: 'TRY',
      transactionAt: DateTime(2026, 7, 14, 13, 40),
      matchStatus: BankTxMatchStatus.unmatched,
      counterpartyName: 'BILINMEYEN GONDERICI',
      description: 'GELEN HAVALE REFNO 998877',
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

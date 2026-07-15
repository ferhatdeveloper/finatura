import { amountsEqual, roundMoney } from './format.js';
import type { LucaFis } from './types.js';

export interface ValidationIssue {
  fisNo: number;
  seviye: 'error' | 'warn';
  mesaj: string;
}

export function validateFis(fis: LucaFis): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const borc = roundMoney(fis.satirlar.reduce((s, r) => s + r.borc, 0));
  const alacak = roundMoney(fis.satirlar.reduce((s, r) => s + r.alacak, 0));

  if (fis.satirlar.length < 2) {
    issues.push({
      fisNo: fis.fisNo,
      seviye: 'error',
      mesaj: 'Yevmiye fişinde en az iki satır olmalı (çift kayıt).',
    });
  }

  if (!amountsEqual(borc, alacak)) {
    issues.push({
      fisNo: fis.fisNo,
      seviye: 'error',
      mesaj: `Borç/alacak dengesiz: borc=${borc.toFixed(2)} alacak=${alacak.toFixed(2)}`,
    });
  }

  for (const satir of fis.satirlar) {
    if (!satir.hesapKodu?.trim()) {
      issues.push({
        fisNo: fis.fisNo,
        seviye: 'error',
        mesaj: `Satır ${satir.siraNo}: hesap kodu boş.`,
      });
    }
    if (satir.borc > 0 && satir.alacak > 0) {
      issues.push({
        fisNo: fis.fisNo,
        seviye: 'warn',
        mesaj: `Satır ${satir.siraNo}: hem borç hem alacak dolu (Luca tek taraflı bekler).`,
      });
    }
  }

  return issues;
}

export function validateFisler(fisler: LucaFis[]): ValidationIssue[] {
  return fisler.flatMap(validateFis);
}

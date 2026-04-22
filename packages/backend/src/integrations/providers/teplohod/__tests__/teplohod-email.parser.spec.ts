import { describe, expect, it } from 'vitest';

import {
  coalesceEmailBody,
  extractPlainFromSimpleEml,
  isFromTeplohodOfficial,
  parseTeplohodIncomingEmail,
} from '../teplohod-email.parser';

describe('parseTeplohodIncomingEmail', () => {
  it('extracts tep- id and amount', () => {
    const r = parseTeplohodIncomingEmail(
      'Ваш заказ tep-12345 оформлен. Сумма 1500 ₽. Спасибо за покупку.',
    );
    expect(r.referenceIds).toContain('tep-12345');
    expect(r.amountsRub).toContain(1500);
    expect(r.kind).toBe('order');
  });

  it('extracts 24-char hex id', () => {
    const id = '507f1f77bcf86cd799439011';
    const r = parseTeplohodIncomingEmail(`Заказ ${id} подтверждён.`);
    expect(r.referenceIds).toContain(id);
  });

  it('detects refund wording', () => {
    const r = parseTeplohodIncomingEmail('Запрос на возврат по заказу принят. Сумма 2 000 ₽');
    expect(r.kind).toBe('refund');
    expect(r.amountsRub).toContain(2000);
  });

  it('coalesceEmailBody strips headers', () => {
    const raw = `From: noreply@teplohod.info\r\nSubject: Test\r\n\r\nТело письма 500 ₽`;
    expect(coalesceEmailBody(raw)).toContain('Тело письма');
  });

  it('flags official sender sale@teplohod.info in From header', () => {
    const raw =
      'From: "Teplohod" <sale@teplohod.info>\r\n' +
      'Subject: Заказ\r\n' +
      '\r\n' +
      'Ваш заказ tep-abc оформлен. 1000 ₽';
    expect(isFromTeplohodOfficial(raw)).toBe(true);
    const r = parseTeplohodIncomingEmail(raw);
    expect(r.fromTeplohodDomain).toBe(true);
    expect(r.signals).toContain('sender_teplohod_domain');
  });

  it('flags Return-Path @teplohod.info', () => {
    const raw =
      'Return-Path: <bounce@smtp.teplohod.info>\r\n' +
      'From: other@example.com\r\n' +
      '\r\n' +
      'текст';
    expect(isFromTeplohodOfficial(raw)).toBe(true);
  });

  /**
   * Реальный формат от Mail.ru / пересылки: сначала Delivered-To, Return-path, затем multipart
   * text/plain в quoted-printable (как в письмах «Куплен билет» от sale@teplohod.info).
   */
  it('parses Mail.ru–style .eml with Delivered-To first and multipart plain', () => {
    const boundary = '_=_swift_test_=_';
    const raw =
      'Delivered-To: tickets@example.com\r\n' +
      'Return-path: <sale@teplohod.info>\r\n' +
      'From: "Teplohod.Info" <sale@teplohod.info>\r\n' +
      'Reply-To: support@teplohod.info\r\n' +
      'MIME-Version: 1.0\r\n' +
      `Content-Type: multipart/alternative;\r\n boundary="${boundary}"\r\n` +
      '\r\n' +
      `--${boundary}\r\n` +
      'Content-Type: text/plain; charset=utf-8\r\n' +
      'Content-Transfer-Encoding: quoted-printable\r\n' +
      '\r\n' +
      '=D0=9D=D0=BE=D0=BC=D0=B5=D1=80 =D0=B1=D0=B8=D0=BB=D0=B5=D1=82=D0=B0\r\n' +
      '\r\n' +
      '784031\r\n' +
      '\r\n' +
      '=D0=A1=D1=83=D0=BC=D0=BC=D0=B0 =D0=B7=D0=B0=D0=BA=D0=B0=D0=B7=D0=B0\r\n' +
      '\r\n' +
      '14000,00=C2=A0=E2=82=BD\r\n' +
      `\r\n--${boundary}--\r\n`;

    expect(extractPlainFromSimpleEml(raw)).toMatch(/784031/);
    expect(extractPlainFromSimpleEml(raw)).toMatch(/14000/);

    const r = parseTeplohodIncomingEmail(raw);
    expect(r.fromTeplohodDomain).toBe(true);
    expect(r.kind).toBe('order');
    expect(r.amountsRub).toContain(14000);
    expect(r.signals).toContain('sender_teplohod_domain');
  });
});

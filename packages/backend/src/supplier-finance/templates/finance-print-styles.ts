/**
 * Единые стили печатных форм финдокументов (A4, без внешних шрифтов/CDN).
 * Классы с префиксом fn- — ориентир на типовую «печатную форму» (1С-подобная сдержанность).
 */
export const FINANCE_PRINT_CSS = `
@page {
  size: A4;
  margin: 10mm 12mm;
}
html {
  background: #fff;
}
body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #000;
  font-family: Arial, Helvetica, "DejaVu Sans", sans-serif;
  font-size: 10.5pt;
  line-height: 1.3;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.fn-doc {
  max-width: 190mm;
  margin: 0 auto;
}
.fn-doc-title {
  text-align: center;
  font-weight: bold;
  font-size: 13pt;
  letter-spacing: 0.03em;
  margin: 0 0 6px 0;
  text-transform: uppercase;
}
.fn-doc-sub {
  text-align: center;
  font-size: 10.5pt;
  font-weight: bold;
  margin: 0 0 14px 0;
}
.fn-meta-two {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
  font-size: 9.5pt;
}
.fn-meta-two td {
  border: 1px solid #000;
  padding: 6px 10px;
  vertical-align: middle;
}
.fn-meta-two td:first-child {
  width: 50%;
  background: #ebebeb;
  font-weight: bold;
}
.fn-section-title {
  font-weight: bold;
  font-size: 10pt;
  margin: 14px 0 6px 0;
  padding-bottom: 3px;
  border-bottom: 1px solid #000;
}
.fn-req-table {
  width: 100%;
  border-collapse: collapse;
  margin: 4px 0 14px 0;
  font-size: 9.5pt;
}
.fn-req-table td {
  border: 1px solid #000;
  padding: 5px 8px;
  vertical-align: top;
}
.fn-req-table td:first-child {
  width: 30%;
  background: #ebebeb;
  font-weight: bold;
}
.fn-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0 12px 0;
  font-size: 9.5pt;
}
.fn-table th {
  border: 1px solid #000;
  padding: 7px 5px;
  background: #d9d9d9;
  font-weight: bold;
  text-align: center;
  vertical-align: middle;
}
.fn-table td {
  border: 1px solid #000;
  padding: 5px 6px;
  vertical-align: top;
}
.fn-table td.numeric,
.fn-table .numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.fn-table tfoot td {
  font-weight: bold;
  background: #e8e8e8;
}
.fn-bank {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 14px;
  font-size: 9.5pt;
}
.fn-bank td {
  border: 1px solid #000;
  padding: 6px 8px;
  vertical-align: middle;
}
.fn-total-box {
  margin-top: 6px;
  margin-left: auto;
  width: 100%;
  max-width: 95mm;
  border-collapse: collapse;
  border: 2px solid #000;
  font-size: 10pt;
}
.fn-total-box td {
  padding: 6px 10px;
  border: 1px solid #000;
}
.fn-total-box td:first-child {
  font-weight: bold;
  background: #ebebeb;
  width: 62%;
}
.fn-total-box td.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.fn-total-box tr.fn-total-pay td {
  font-weight: bold;
  font-size: 11pt;
  background: #f5f5f5;
}
.fn-total-box tr.fn-total-pay td.numeric {
  border-top: double 3px #000;
}
.fn-signatures {
  margin-top: 26px;
  page-break-inside: avoid;
  font-size: 9.5pt;
}
.fn-sig-pair {
  display: table;
  width: 100%;
  margin-top: 18px;
}
.fn-sig-pair > div {
  display: table-cell;
  width: 50%;
  vertical-align: top;
  padding-right: 12px;
}
.fn-sig-line {
  border-bottom: 1px solid #000;
  min-height: 26px;
  margin: 10px 0 4px 0;
}
.fn-small-note {
  font-size: 8.5pt;
  margin-top: 14px;
  color: #000;
}
.fn-upd-top {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
}
.fn-upd-top td {
  vertical-align: top;
}
.fn-upd-status {
  border: 2px solid #000;
  padding: 8px;
  text-align: center;
  width: 68px;
  font-size: 8.5pt;
}
.fn-upd-head-main {
  padding-left: 12px;
  font-size: 10.5pt;
}
.fn-upd-head-main .fn-upd-name {
  font-weight: bold;
  font-size: 11pt;
  margin-bottom: 4px;
}
table {
  border-collapse: collapse;
}
th, td {
  vertical-align: top;
}
.num, .td-num, td.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
thead {
  display: table-header-group;
}
tfoot {
  display: table-footer-group;
}
tbody tr {
  page-break-inside: auto;
}
.signatures,
.sign-block,
.footer-table {
  page-break-inside: avoid;
}
.fn-avoid-break {
  page-break-inside: avoid;
}
h1, h2, .header, .header-title {
  page-break-after: avoid;
}
@media print {
  a {
    color: #000;
    text-decoration: none;
  }
}
.fn-pp1137-appendix {
  font-size: 8.2pt;
  line-height: 1.25;
  text-align: center;
  margin: 0 0 8px 0;
}
.fn-sf-correction {
  font-size: 9.5pt;
  margin: 0 0 10px 0;
}
.fn-sf-doc-line {
  font-size: 10.5pt;
  font-weight: bold;
  margin: 0 0 4px 0;
  text-align: center;
}
.fn-sf-num-mark {
  font-size: 8.5pt;
  font-weight: normal;
}
.fn-table-1137 {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0 12px 0;
  font-size: 7.4pt;
  table-layout: fixed;
}
.fn-table-1137 th,
.fn-table-1137 td {
  border: 1px solid #000;
  padding: 3px 2px;
  vertical-align: middle;
  word-wrap: break-word;
}
.fn-table-1137 th {
  background: #d9d9d9;
  font-weight: bold;
  text-align: center;
  line-height: 1.15;
}
.fn-table-1137 .numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.fn-table-1137 tfoot td {
  font-weight: bold;
  background: #e8e8e8;
}
.fn-std-disclaimer {
  font-size: 8pt;
  line-height: 1.3;
  margin: 6px 0 0 0;
  text-align: justify;
}
.fn-upd-two-col {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 10px 0;
  font-size: 9.2pt;
}
.fn-upd-two-col td {
  border: 1px solid #000;
  padding: 4px 6px;
  vertical-align: top;
  width: 50%;
}
.fn-upd-two-col .fn-ud-label {
  width: 38%;
  background: #ebebeb;
  font-weight: bold;
}
.fn-upd-four {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 12px 0;
  font-size: 9pt;
}
.fn-upd-four td {
  border: 1px solid #000;
  padding: 4px 6px;
  vertical-align: top;
}
.fn-upd-four .fn-ud-label {
  width: 18%;
  background: #ebebeb;
  font-weight: bold;
}
.fn-page-footer {
  font-size: 8.5pt;
  text-align: right;
  margin-top: 10px;
}
.fn-act-signed-row {
  margin-top: 22px;
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
}
.fn-act-signed-row td {
  width: 50%;
  vertical-align: top;
  font-weight: bold;
  text-transform: uppercase;
  padding: 8px 6px 0 0;
}
`;

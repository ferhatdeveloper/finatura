/** Ortak basılabilir A4 stil iskeleti. */
export const SHARED_FORM_CSS = `
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    font-size: 11pt;
    line-height: 1.45;
    margin: 0;
  }
  .sheet { max-width: 190mm; margin: 0 auto; }
  .letterhead {
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 10px;
    margin-bottom: 18px;
  }
  .letterhead h1 {
    font-size: 16pt;
    margin: 0 0 4px;
    letter-spacing: 0.02em;
  }
  .letterhead .meta { font-size: 9pt; color: #444; }
  .doc-title {
    text-align: center;
    font-size: 14pt;
    font-weight: 700;
    margin: 16px 0 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .doc-sub {
    text-align: center;
    font-size: 9pt;
    color: #555;
    margin-bottom: 18px;
  }
  table.grid {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 16px;
  }
  table.grid th, table.grid td {
    border: 1px solid #ccc;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  table.grid th {
    width: 32%;
    background: #f5f5f5;
    font-weight: 600;
    font-size: 9.5pt;
  }
  h2 {
    font-size: 11pt;
    margin: 16px 0 8px;
    border-left: 3px solid #1a1a1a;
    padding-left: 8px;
  }
  .clauses { margin: 0; padding-left: 18px; }
  .clauses li { margin-bottom: 6px; }
  .signatures {
    display: flex;
    gap: 24px;
    margin-top: 36px;
  }
  .sig-box {
    flex: 1;
    border-top: 1px solid #999;
    padding-top: 8px;
    text-align: center;
    min-height: 70px;
  }
  .sig-box .role { font-weight: 600; font-size: 10pt; }
  .sig-box .hint { font-size: 8.5pt; color: #666; margin-top: 28px; }
  .footer {
    margin-top: 28px;
    font-size: 8pt;
    color: #777;
    border-top: 1px solid #ddd;
    padding-top: 8px;
  }
`;

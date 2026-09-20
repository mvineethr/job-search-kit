/**
 * The résumé document's own styles.
 *
 * Kept as a string rather than a .css file because it is needed twice: as a
 * stylesheet on screen, and as text to inline inside the standalone HTML used
 * for PDF export. One source means screen and print cannot drift apart.
 *
 * Contains no backticks or ${ — keep it that way, or escape them.
 */
export const DOCUMENT_CSS = `
.resume{
  font-family:Georgia,'Times New Roman',serif;
  font-size:11pt; line-height:1.45; color:#1c1b19; background:#ffffff;
  max-width:7.5in; margin:0 auto; padding:0.5in;
}
.resume h1{font-size:20pt; margin:0 0 2pt; font-weight:700}
.resume .target{font-size:11pt; color:#444; margin:0 0 4pt}
.resume .contact{font-size:9.5pt; color:#444; margin:0 0 14pt}
.resume h2{
  font-size:10pt; text-transform:uppercase; letter-spacing:.08em;
  border-bottom:1px solid #999; padding-bottom:2pt; margin:14pt 0 6pt;
}
.resume p, .resume li{margin:0 0 4pt}
.resume ul{margin:4pt 0 0; padding-left:16pt}
.resume .role{margin-bottom:10pt}
.resume .role-line{display:flex; justify-content:space-between; gap:12pt; flex-wrap:wrap}
.resume .role-title{font-weight:700}
.resume .role-meta{color:#444; font-size:9.5pt; white-space:nowrap}
.resume .metric-needed{
  background:#fdf4e0; color:#8a6410; padding:0 3pt; border-radius:2pt; font-weight:600;
}

/* Screen only: the half-inch print margin costs a quarter of a phone screen. */
@media screen and (max-width:640px){
  .resume{padding:24px 20px}
}

@media print{
  @page{margin:0.5in}
  .resume{padding:0; max-width:none}
  .resume .metric-needed{background:none; color:#1c1b19; font-weight:400}
  .resume .role{break-inside:avoid}
  .resume h2{break-after:avoid}
}
`;

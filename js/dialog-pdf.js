(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;

  // PDF export dialog: settings on the left, a live preview of the actual print
  // document (Sheet.buildPrintDocument) on the right. Settings are saved in
  // Sheet.pdfSettings; the loadout picks only last while the dialog is open.

  const SECTION_LABELS = {
    portrait: 'PORTRAIT', backStory: 'BACK STORY', conflictNotes: 'CONFLICT NOTES',
    setbacks: 'SETBACKS', cybernetics: 'CYBERNETICS', skills: 'STANDARD SKILLS', specialtySkills: 'SPECIALTY SKILLS',
    equipment: 'WEAPONS & EQUIPMENT', notes: 'NOTES',
  };
  const DETAIL_OPTIONS = [['hideUnreachedRanks', 'HIDE UNREACHED SPECIALTY RANKS'], ['compact', 'COMPACT (NO DESCRIPTIONS)']];

  // Width of an A4 sheet in CSS px (210mm at 96dpi); the preview paper is zoomed to fit its pane.
  const PAPER_WIDTH_PX = 794;

  function checkbox(checked, action, attrs, label, disabled) {
    return '<button class="check' + (checked ? ' selected' : '') + '" data-action="' + action + '" ' + attrs + (disabled ? ' disabled' : '') + '>'
      + '<span class="checkbox-box">' + (checked ? '✕' : '') + '</span>'
      + '<span class="label">' + escapeHtml(label) + '</span></button>';
  }

  function group(title, body) {
    return '<div class="pdf-group"><div class="label pdf-group-title">' + title + '</div>' + body + '</div>';
  }

  function renderSettingsMarkup() {
    const pdf = Sheet.pdfSettings;
    const loadoutIds = Sheet.state.pdfDialog.loadoutIds;
    const loadouts = Sheet.state.loadouts || [];
    return group('SECTIONS', Sheet.PDF_SECTION_KEYS.map((key) => checkbox(pdf.sections[key], 'pdfToggle', 'data-key="sections.' + key + '"', SECTION_LABELS[key])).join(''))
      + group('LOADOUTS', loadouts.map((loadout) => checkbox(loadoutIds.indexOf(loadout.id) >= 0, 'pdfLoadout', 'data-loadout-id="' + loadout.id + '"', loadout.name, !pdf.sections.equipment)).join(''))
      + group('DETAIL', DETAIL_OPTIONS.map(([key, label]) => checkbox(pdf[key], 'pdfToggle', 'data-key="' + key + '"', label)).join(''));
  }

  function fitPreview() {
    const pane = query('#pdfPreview');
    const paper = query('#pdfPaper');
    if (!pane || !paper) return;
    const available = pane.clientWidth - 24;
    paper.style.zoom = String(Math.min(1, Math.max(0.3, available / PAPER_WIDTH_PX)));
  }

  // Re-renders the settings and the preview in place, keeping both scroll positions.
  function refresh() {
    const settingsEl = query('#pdfSettings');
    const pane = query('#pdfPreview');
    const paper = query('#pdfPaper');
    if (!settingsEl || !paper) return;
    const settingsScroll = settingsEl.scrollTop;
    const previewScroll = pane.scrollTop;
    settingsEl.innerHTML = renderSettingsMarkup();
    paper.innerHTML = Sheet.buildPrintDocument(Sheet.pdfOptions());
    settingsEl.scrollTop = settingsScroll;
    pane.scrollTop = previewScroll;
  }

  function renderPdfDialog() {
    if (!Sheet.state.pdfDialog) return;
    const html = '<div class="panel-header"><div class="title">EXPORT PDF</div></div>'
      + '<div class="pdf-layout">'
      + '<div class="pdf-settings" id="pdfSettings"></div>'
      + '<div class="pdf-preview" id="pdfPreview"><div class="print-doc p-paper" id="pdfPaper"></div></div>'
      + '</div>'
      + '<div class="dialog-footer"><button class="btn" data-action="dlgCancel">CANCEL</button>'
      + '<button class="btn primary" data-action="pdfPrint">SAVE PDF</button></div>';
    query('#dialog').className = 'dialog dialog-pdf';
    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
    refresh();
    fitPreview();
  }

  Sheet.openPdfDialog = function openPdfDialog() {
    if (!Sheet.state) return;
    Sheet.state.pdfDialog = { loadoutIds: (Sheet.state.loadouts || []).map((loadout) => loadout.id) };
    renderPdfDialog();
  };

  Sheet.closePdfDialog = function closePdfDialog() {
    Sheet.state.pdfDialog = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
    // v1's other dialogs don't set the dialog's class themselves, so drop the wide PDF layout.
    query('#dialog').className = 'dialog';
  };

  // key is a setting name ("compact") or "sections.<name>".
  Sheet.togglePdfSetting = function togglePdfSetting(key) {
    if (!Sheet.state.pdfDialog) return;
    const pdf = Sheet.pdfSettings;
    const [head, tail] = key.split('.');
    if (tail) pdf[head][tail] = !pdf[head][tail];
    else pdf[head] = !pdf[head];
    Sheet.persistPdfSettings();
    refresh();
  };

  Sheet.togglePdfLoadout = function togglePdfLoadout(loadoutId) {
    const dialog = Sheet.state.pdfDialog;
    if (!dialog) return;
    dialog.loadoutIds = dialog.loadoutIds.indexOf(loadoutId) >= 0
      ? dialog.loadoutIds.filter((id) => id !== loadoutId)
      : dialog.loadoutIds.concat([loadoutId]);
    refresh();
  };

  Sheet.printFromPdfDialog = function printFromPdfDialog() {
    if (!Sheet.state.pdfDialog) return;
    const options = Sheet.pdfOptions();
    Sheet.closePdfDialog();
    Sheet.printCharacter(options);
  };

  window.addEventListener('resize', () => { if (Sheet.state.pdfDialog) fitPreview(); });
})(window.Sheet = window.Sheet || {});

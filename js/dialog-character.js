(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;

  Sheet.openCharacterDialog = function openCharacterDialog(characterSummary) {
    Sheet.ui.characterDialog = { id: characterSummary ? characterSummary.id : null, name: characterSummary ? characterSummary.name : '' };
    renderCharacterDialog();
  };

  Sheet.closeCharacterDialog = function closeCharacterDialog() {
    Sheet.ui.characterDialog = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  };

  function renderCharacterDialog() {
    const dialog = Sheet.ui.characterDialog;
    if (!dialog) return;
    const html = '<div class="panel-header"><div class="title">' + (dialog.id ? 'RENAME AGENT' : 'NEW AGENT') + '</div></div>'
      + '<div class="col"><label class="label" for="characterDialogName">AGENT NAME</label>'
      + '<input class="field" id="characterDialogName" value="' + escapeHtml(dialog.name) + '"></div>'
      + '<div class="dialog-footer"><button class="btn ghost" data-action="dlgCancel">CANCEL</button>'
      + '<button class="btn primary" data-action="dlgSave">SAVE</button></div>';
    query('#dialog').className = 'dialog';
    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
    const nameEl = query('#characterDialogName');
    if (nameEl) nameEl.focus();
  }

  Sheet.saveCharacterDialog = function saveCharacterDialog() {
    const dialog = Sheet.ui.characterDialog;
    if (!dialog) return;
    const nameEl = query('#characterDialogName');
    const name = (nameEl ? nameEl.value : dialog.name || '').trim();

    if (dialog.id) {
      Sheet.renameCharacter(dialog.id, name);
      Sheet.closeCharacterDialog();
      Sheet.renderRosterView();
    } else {
      const newId = Sheet.createCharacter(name || 'Unnamed Agent');
      Sheet.closeCharacterDialog();
      window.location.hash = '#/character/' + newId;
    }
  };
})(window.Sheet = window.Sheet || {});

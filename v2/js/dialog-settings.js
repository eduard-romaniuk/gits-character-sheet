(function (Sheet) {
  'use strict';

  const query = Sheet.query;

  Sheet.applySettings = function applySettings() {
    document.body.classList.toggle('force-align-blocks', !!(Sheet.settings || {}).forceBlockHeightAlignment);
  };

  Sheet.openSettingsDialog = function openSettingsDialog() {
    Sheet.ui.settingsDialog = true;
    renderSettingsDialog();
  };

  Sheet.closeSettingsDialog = function closeSettingsDialog() {
    Sheet.ui.settingsDialog = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  };

  function renderSettingsDialog() {
    if (!Sheet.ui.settingsDialog) return;
    const checked = !!Sheet.settings.forceBlockHeightAlignment;
    const html = '<div class="panel-header"><div class="title">SETTINGS</div></div>'
      + '<button class="check' + (checked ? ' selected' : '') + '" data-action="dlgToggleAlign">'
      + '<span class="checkbox-box">' + (checked ? '✕' : '') + '</span>'
      + '<span class="label">FORCE BLOCK HEIGHT ALIGNMENT</span></button>'
      + '<div class="dialog-footer"><button class="btn primary" data-action="dlgCancel">CLOSE</button></div>';
    query('#dialog').className = 'dialog';
    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
  }

  Sheet.toggleSettingsAlignment = function toggleSettingsAlignment() {
    if (!Sheet.ui.settingsDialog) return;
    Sheet.settings.forceBlockHeightAlignment = !Sheet.settings.forceBlockHeightAlignment;
    Sheet.persistSettings();
    Sheet.applySettings();
    renderSettingsDialog();
  };
})(window.Sheet = window.Sheet || {});

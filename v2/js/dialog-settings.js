(function (Sheet) {
  'use strict';

  const query = Sheet.query;

  Sheet.applySettings = function applySettings() {
    const settings = Sheet.settings || {};
    document.body.classList.toggle('force-align-blocks', !!settings.forceBlockHeightAlignment);
    document.body.classList.toggle('show-agent-id', !!settings.showAgentId);
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
    const alignChecked = !!Sheet.settings.forceBlockHeightAlignment;
    const agentIdChecked = !!Sheet.settings.showAgentId;
    const html = '<div class="panel-header"><div class="title">SETTINGS</div></div>'
      + '<button class="check' + (alignChecked ? ' selected' : '') + '" data-action="dlgToggleAlign">'
      + '<span class="checkbox-box">' + (alignChecked ? '✕' : '') + '</span>'
      + '<span class="label">FORCE BLOCK HEIGHT ALIGNMENT</span></button>'
      + '<button class="check' + (agentIdChecked ? ' selected' : '') + '" data-action="dlgToggleShowAgentId">'
      + '<span class="checkbox-box">' + (agentIdChecked ? '✕' : '') + '</span>'
      + '<span class="label">SHOW AGENT ID FIELD</span></button>'
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

  Sheet.toggleSettingsShowAgentId = function toggleSettingsShowAgentId() {
    if (!Sheet.ui.settingsDialog) return;
    Sheet.settings.showAgentId = !Sheet.settings.showAgentId;
    Sheet.persistSettings();
    Sheet.applySettings();
    // Roster cards embed the agent ID in their markup (unlike the body-class-driven
    // alignment toggle), so they need a re-render to pick up the change immediately.
    const rosterEl = query('#view-roster');
    if (rosterEl && !rosterEl.hidden) Sheet.renderRosterView();
    renderSettingsDialog();
  };
})(window.Sheet = window.Sheet || {});

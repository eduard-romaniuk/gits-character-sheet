(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;

  Sheet.openLoadoutDialog = function openLoadoutDialog(loadout) {
    Sheet.state.loadoutDialog = { id: loadout ? loadout.id : null, name: loadout ? loadout.name : '' };
    renderLoadoutDialog();
  };

  Sheet.closeLoadoutDialog = function closeLoadoutDialog() {
    Sheet.state.loadoutDialog = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  };

  function renderLoadoutDialog() {
    const dialog = Sheet.state.loadoutDialog;
    if (!dialog) return;
    const html = '<div class="panel-header"><div class="title">' + (dialog.id ? 'RENAME LOADOUT' : 'NEW LOADOUT') + '</div></div>'
      + '<div class="col"><label class="label" for="loadoutDialogName">NAME</label>'
      + '<input class="field" id="loadoutDialogName" value="' + escapeHtml(dialog.name) + '"></div>'
      + '<div class="dialog-footer"><button class="btn ghost" data-action="dlgCancel">CANCEL</button>'
      + '<button class="btn primary" data-action="dlgSave">SAVE</button></div>';
    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
    const nameEl = query('#loadoutDialogName');
    if (nameEl) nameEl.focus();
  }

  Sheet.saveLoadoutDialog = function saveLoadoutDialog() {
    const dialog = Sheet.state.loadoutDialog;
    if (!dialog) return;
    const nameEl = query('#loadoutDialogName');
    const name = (nameEl ? nameEl.value : dialog.name || '').trim();
    if (!name) { Sheet.closeLoadoutDialog(); return; }

    if (dialog.id) {
      Sheet.state.loadouts = (Sheet.state.loadouts || []).map((loadout) => (loadout.id === dialog.id ? { ...loadout, name: name } : loadout));
    } else {
      const newLoadout = { id: Sheet.generateId(), name: name };
      Sheet.state.loadouts = (Sheet.state.loadouts || []).concat([newLoadout]);
      Sheet.state.activeLoadoutId = newLoadout.id;
    }

    Sheet.closeLoadoutDialog();
    Sheet.persistState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };

  Sheet.activateLoadout = function activateLoadout(loadoutId) {
    if (!loadoutId || loadoutId === Sheet.state.activeLoadoutId) return;
    Sheet.state.activeLoadoutId = loadoutId;
    Sheet.persistState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };

  Sheet.deleteLoadout = function deleteLoadout(loadoutId) {
    const loadouts = Sheet.state.loadouts || [];
    if (loadouts.length <= 1) return;
    const loadout = loadouts.filter((entry) => entry.id === loadoutId)[0];
    if (!loadout) return;
    const itemCount = (Sheet.state.items.Equipment || []).filter((item) => item.loadoutId === loadoutId).length;
    const message = itemCount
      ? 'Delete loadout "' + loadout.name + '" and its ' + itemCount + ' item' + (itemCount > 1 ? 's' : '') + '?'
      : 'Delete loadout "' + loadout.name + '"?';
    if (!window.confirm(message)) return;

    Sheet.state.items.Equipment = (Sheet.state.items.Equipment || []).filter((item) => item.loadoutId !== loadoutId);
    Sheet.state.loadouts = loadouts.filter((entry) => entry.id !== loadoutId);
    if (Sheet.state.activeLoadoutId === loadoutId) Sheet.state.activeLoadoutId = Sheet.state.loadouts[0].id;
    Sheet.persistState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };
})(window.Sheet = window.Sheet || {});

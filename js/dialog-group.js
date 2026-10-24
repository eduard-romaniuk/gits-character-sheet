(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;

  Sheet.openGroupDialog = function openGroupDialog(group) {
    Sheet.ui.groupDialog = { id: group ? group.id : null, name: group ? group.name : '' };
    renderGroupDialog();
  };

  Sheet.closeGroupDialog = function closeGroupDialog() {
    Sheet.ui.groupDialog = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  };

  function renderGroupDialog() {
    const dialog = Sheet.ui.groupDialog;
    if (!dialog) return;
    const html = '<div class="panel-header"><div class="title">' + (dialog.id ? 'RENAME GROUP' : 'NEW GROUP') + '</div></div>'
      + '<div class="col"><label class="label" for="groupDialogName">NAME</label>'
      + '<input class="field" id="groupDialogName" value="' + escapeHtml(dialog.name) + '"></div>'
      + '<div class="dialog-footer"><button class="btn ghost" data-action="dlgCancel">CANCEL</button>'
      + '<button class="btn primary" data-action="dlgSave">SAVE</button></div>';
    query('#dialog').className = 'dialog';
    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
    const nameEl = query('#groupDialogName');
    if (nameEl) nameEl.focus();
  }

  Sheet.saveGroupDialog = function saveGroupDialog() {
    const dialog = Sheet.ui.groupDialog;
    if (!dialog) return;
    const nameEl = query('#groupDialogName');
    const name = (nameEl ? nameEl.value : dialog.name || '').trim();
    if (!name) { Sheet.closeGroupDialog(); return; }

    if (dialog.id) {
      Sheet.groups = (Sheet.groups || []).map((group) => (group.id === dialog.id ? { ...group, name: name } : group));
    } else {
      const newGroup = { id: Sheet.generateId(), name: name, createdAt: Date.now() };
      Sheet.groups = (Sheet.groups || []).concat([newGroup]);
      Sheet.ui.libraryGroupId = newGroup.id;
    }
    Sheet.persistGroups();
    Sheet.closeGroupDialog();
    Sheet.renderLibraryView();
  };

  Sheet.deleteGroup = function deleteGroup(groupId) {
    const group = (Sheet.groups || []).find((g) => g.id === groupId);
    if (!group) return;
    let itemCount = 0;
    Sheet.ITEM_SECTIONS.forEach(([sectionKey]) => { itemCount += (Sheet.library[sectionKey] || []).filter((item) => item.groupId === groupId).length; });
    const message = itemCount
      ? 'Delete group "' + group.name + '"? Its ' + itemCount + ' item' + (itemCount > 1 ? 's' : '') + ' will become ungrouped, not deleted.'
      : 'Delete group "' + group.name + '"?';
    if (!window.confirm(message)) return;

    Sheet.ITEM_SECTIONS.forEach(([sectionKey]) => {
      Sheet.library[sectionKey] = (Sheet.library[sectionKey] || []).map((item) => (item.groupId === groupId ? { ...item, groupId: null } : item));
    });
    Sheet.persistLibrary();
    Sheet.groups = (Sheet.groups || []).filter((g) => g.id !== groupId);
    Sheet.persistGroups();
    if (Sheet.ui.libraryGroupId === groupId) Sheet.ui.libraryGroupId = 'ALL';
    Sheet.renderLibraryView();
  };
})(window.Sheet = window.Sheet || {});

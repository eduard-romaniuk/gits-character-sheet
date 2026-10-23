(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;

  Sheet.openItemPicker = function openItemPicker(section) {
    Sheet.ui.pickerDialog = { section: section, search: '', groupId: 'ALL', equipmentType: 'weapon' };
    Sheet.renderItemPicker();
  };

  Sheet.closeItemPicker = function closeItemPicker() {
    Sheet.ui.pickerDialog = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  };

  function groupLabel(groupId) {
    if (groupId === 'ALL') return 'ALL';
    if (groupId === 'UNGROUPED') return Sheet.DEFAULT_GROUP_NAME;
    const group = (Sheet.groups || []).find((g) => g.id === groupId);
    return group ? group.name : Sheet.DEFAULT_GROUP_NAME;
  }

  function filteredLibraryItems(dialog) {
    const list = Sheet.library[dialog.section] || [];
    const search = dialog.search.trim().toLowerCase();
    return list.filter((item) => {
      if (dialog.section === 'Equipment' && (item.type || 'weapon') !== dialog.equipmentType) return false;
      if (dialog.groupId === 'UNGROUPED' && item.groupId) return false;
      if (dialog.groupId !== 'ALL' && dialog.groupId !== 'UNGROUPED' && item.groupId !== dialog.groupId) return false;
      if (search && item.name.toLowerCase().indexOf(search) < 0) return false;
      return true;
    });
  }

  // The type tab already says what type this is (see the equipment-type tab row
  // below), so the row summary doesn't repeat it — matches render-library.js.
  function summaryFor(section, item) {
    if (section === 'Equipment') {
      const type = item.type || 'weapon';
      const parts = [];
      (Sheet.EQUIPMENT_FIELDS[type] || []).forEach(([fieldKey]) => {
        if (fieldKey === 'qty' || fieldKey === 'fittedId' || fieldKey === 'cost') return;
        if (item[fieldKey]) parts.push((Sheet.META_LABEL_PREFIX[fieldKey] || fieldKey.toUpperCase()) + ' ' + item[fieldKey]);
      });
      parts.push('COST ' + (item.cost || 0));
      return parts.join('  ·  ');
    }
    if (section === 'SpecialtySkills') return 'MAX RANKS ' + (item.maxRanks || 1);
    if (section === 'Cybernetics') return [item.armor ? 'ARMOR ' + item.armor : '', item.damage ? 'DMG ' + item.damage : ''].filter(Boolean).join('  ·  ');
    return '';
  }

  function buildPickerRowsHtml(dialog) {
    const items = filteredLibraryItems(dialog);
    if (!items.length) return '<div class="empty">NO MATCHING CODEX ITEMS. ADD SOME FROM THE CODEX VIEW.</div>';
    return items.map((item) => {
      const meta = summaryFor(dialog.section, item);
      return '<div class="row"><button class="row-name" data-action="pickerChoose" data-library-id="' + item.id + '">' + escapeHtml(item.name) + '</button>'
        + '<div class="spacer"></div>' + (meta ? '<div class="meta">' + escapeHtml(meta) + '</div>' : '')
        + '<button class="btn small" data-action="pickerChoose" data-library-id="' + item.id + '">PICK</button></div>';
    }).join('');
  }

  Sheet.renderItemPicker = function renderItemPicker() {
    const dialog = Sheet.ui.pickerDialog;
    if (!dialog) return;
    const groupIds = ['ALL', 'UNGROUPED'].concat((Sheet.groups || []).map((g) => g.id));
    const isEquipment = dialog.section === 'Equipment';

    // Two rows of tabs, same pattern as the Codex page: groups on top (dashed
    // divider), then equipment type underneath when applicable.
    const groupsRow = '<div class="loadout-bar"><div class="chips">'
      + groupIds.map((id) => '<button class="chip' + (dialog.groupId === id ? ' selected' : '') + '" data-action="pickerGroup" data-group-id="' + id + '">' + escapeHtml(groupLabel(id)) + '</button>').join('')
      + '</div></div>';
    const typeRow = isEquipment ? '<div class="chips">'
      + Sheet.EQUIPMENT_TYPES.map(([type, label]) => '<button class="chip' + (dialog.equipmentType === type ? ' selected' : '') + '" data-action="pickerEquipmentType" data-equipment-type="' + type + '">' + label + '</button>').join('')
      + '</div>' : '';

    const html = '<div class="panel-header"><div class="title">ADD FROM CODEX</div></div>'
      + groupsRow
      + typeRow
      + '<input class="field" id="pickerSearch" placeholder="Search…" value="' + escapeHtml(dialog.search) + '">'
      + '<div class="rows picker-list" id="pickerRows">' + buildPickerRowsHtml(dialog) + '</div>'
      + '<div class="dialog-footer">'
      + '<button class="btn small" data-action="pickerCreateNew" type="button" style="margin-right:auto">+ CREATE NEW</button>'
      + '<button class="btn ghost" data-action="dlgCancel">CANCEL</button></div>';

    query('#dialog').className = 'dialog dialog-wide';
    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
    const searchEl = query('#pickerSearch');
    if (searchEl) { searchEl.focus(); searchEl.setSelectionRange(searchEl.value.length, searchEl.value.length); }
  };

  // Only the row list is patched on keystroke so the search input never loses focus/cursor position.
  Sheet.setPickerSearch = function setPickerSearch(value) {
    if (!Sheet.ui.pickerDialog) return;
    Sheet.ui.pickerDialog.search = value;
    const rowsEl = query('#pickerRows');
    if (rowsEl) rowsEl.innerHTML = buildPickerRowsHtml(Sheet.ui.pickerDialog);
  };

  Sheet.setPickerGroup = function setPickerGroup(groupId) {
    if (!Sheet.ui.pickerDialog) return;
    Sheet.ui.pickerDialog.groupId = groupId;
    Sheet.renderItemPicker();
  };

  Sheet.setPickerEquipmentType = function setPickerEquipmentType(type) {
    if (!Sheet.ui.pickerDialog) return;
    Sheet.ui.pickerDialog.equipmentType = type;
    Sheet.renderItemPicker();
  };

  function defaultOverlayFor(section, libraryId) {
    if (section === 'Skills' || section === 'SpecialtySkills') return { rank: 1 };
    if (section === 'Equipment') {
      const libItem = Sheet.findLibraryItem(section, libraryId);
      const overlay = { loadoutId: Sheet.state.activeLoadoutId, used: 0 };
      if (libItem && Sheet.isSingleUse(libItem)) overlay.qty = 1;
      if (libItem && libItem.type === 'attachment') {
        const options = Sheet.weaponOptions();
        if (options[0]) overlay.fittedId = options[0].value;
      }
      return overlay;
    }
    return {};
  }

  // Links a new character instance to a library item. Shared by picking an existing
  // row and by finishing the "+ CREATE NEW" flow (dialog-item-standalone.js). Returns
  // the created instance (or null) so callers can offer to configure it right away.
  Sheet.applyPickedLibraryItem = function applyPickedLibraryItem(section, libraryId) {
    if (!Sheet.findLibraryItem(section, libraryId)) return null;
    const instance = Sheet.linkNewInstance(section, libraryId, defaultOverlayFor(section, libraryId));
    Sheet.persistCharacterState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
    return instance;
  };

  Sheet.pickLibraryItem = function pickLibraryItem(libraryId) {
    const dialog = Sheet.ui.pickerDialog;
    if (!dialog) return;
    const section = dialog.section;
    const instance = Sheet.applyPickedLibraryItem(section, libraryId);
    Sheet.closeItemPicker();
    if (instance) Sheet.openInstanceDialogIfConfigurable(section, instance.instanceId);
  };

  // Opens the library "new item" dialog on top of the picker, tagged with enough
  // context (section) that saving it also links the freshly created library item onto
  // the character instead of just returning to the library.
  Sheet.openCreateFromPicker = function openCreateFromPicker() {
    const dialog = Sheet.ui.pickerDialog;
    if (!dialog) return;
    const defaultGroupId = ['ALL', 'UNGROUPED'].indexOf(dialog.groupId) < 0 ? dialog.groupId : null;
    const lockedType = dialog.section === 'Equipment' ? dialog.equipmentType : null;
    Sheet.openStandaloneItemDialog('library', dialog.section, null, defaultGroupId, true, lockedType);
  };
})(window.Sheet = window.Sheet || {});

(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;
  const toNumber = Sheet.toNumber;
  const clamp = Sheet.clamp;

  // Sheet.ui.itemDialog shape:
  //  character mode: { mode:'character', section, instanceId (null=new), name, notes, extra }
  //  library mode:   { mode:'library', section, libraryId (null=new), groupId, name, notes, extra,
  //                     fromPicker: boolean, lockedType: string|null }
  // fromPicker is set when this "new library item" dialog was opened via the item
  // picker's "+ CREATE NEW" button — saving it also links the new item onto the
  // character (see saveStandaloneItemDialog) instead of just returning to the library.
  // lockedType is set when opened from a Codex equipment-type tab — it pre-fills and
  // locks extra.type so the redundant TYPE chip selector isn't shown.

  Sheet.openStandaloneItemDialog = function openStandaloneItemDialog(mode, section, sourceItem, groupId, fromPicker, lockedType) {
    // Character-mode source items are already { instanceId, name, notes, extra }.
    // Library-mode source items store their def fields flat (id, groupId, name, notes, ...fields),
    // so the editable "extra" bag has to be rebuilt from those flat fields instead.
    let extra;
    if (!sourceItem) extra = {};
    else if (mode === 'library') extra = Sheet.buildLibraryDefBag(section, sourceItem);
    else extra = { ...(sourceItem.extra || {}) };
    if (section === 'Equipment' && !extra.type) extra.type = lockedType || 'weapon';
    Sheet.ui.itemDialog = {
      mode: mode,
      section: section,
      instanceId: mode === 'character' && sourceItem ? sourceItem.instanceId : null,
      libraryId: mode === 'library' && sourceItem ? sourceItem.id : null,
      groupId: mode === 'library' ? (sourceItem ? (sourceItem.groupId || null) : (groupId || null)) : null,
      name: sourceItem ? sourceItem.name : '',
      notes: sourceItem ? (sourceItem.notes || '') : '',
      extra: extra,
      fromPicker: mode === 'library' && !sourceItem && !!fromPicker,
      lockedType: mode === 'library' && !sourceItem ? (lockedType || null) : null,
    };
    Sheet.renderStandaloneItemDialog();
  };

  Sheet.closeStandaloneItemDialog = function closeStandaloneItemDialog() {
    Sheet.ui.itemDialog = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  };

  Sheet.collectStandaloneDialogInputs = function collectStandaloneDialogInputs() {
    const dialog = Sheet.ui.itemDialog;
    if (!dialog) return;
    const nameEl = query('#dialogName');
    const notesEl = query('#dialogNotes');
    if (nameEl) dialog.name = nameEl.value;
    if (notesEl) dialog.notes = notesEl.value;
    const groupEl = query('#dialogGroup');
    if (groupEl) dialog.groupId = groupEl.value || null;
    Array.prototype.forEach.call(query('#dialog').querySelectorAll('[data-dialog-field]'), (el) => {
      dialog.extra[el.getAttribute('data-dialog-field')] = el.value;
    });
  };

  function buildDialogFields() {
    const dialog = Sheet.ui.itemDialog;
    const extra = dialog.extra || {};
    const isLibrary = dialog.mode === 'library';
    const split = Sheet.LIBRARY_FIELD_SPLIT[dialog.section];

    if (dialog.section === 'Equipment') {
      const type = extra.type || 'weapon';
      return (Sheet.EQUIPMENT_FIELDS[type] || [])
        .filter(([fieldKey]) => fieldKey !== 'cost' && (fieldKey !== 'qty' || (!isLibrary && Sheet.isSingleUse(extra))))
        .filter(([fieldKey]) => !isLibrary || split.def.indexOf(fieldKey) >= 0)
        .map(([fieldKey, label, kind]) => {
          if (kind === 'weapon') {
            const options = Sheet.weaponOptions();
            const current = extra[fieldKey];
            const valid = options.some((option) => option.value === current) ? current : (options[0] ? options[0].value : '');
            return { kind: 'select', field: fieldKey, label: label, value: valid, options: options };
          }
          return { kind: 'text', field: fieldKey, label: label, value: extra[fieldKey] || '' };
        });
    }
    return (Sheet.ITEM_FIELD_SCHEMA[dialog.section] || [])
      .filter(([fieldKey]) => !isLibrary || split.def.indexOf(fieldKey) >= 0)
      .map(([fieldKey, label, kind]) => {
        const raw = extra[fieldKey];
        if (kind === 'rank') {
          const rank = clamp(toNumber(raw, 1), 1, 6);
          extra[fieldKey] = rank;
          return { kind: 'rank', field: fieldKey, label: label, value: rank };
        }
        if (kind === 'max' || kind === 'cur') {
          const hi = kind === 'max' ? 5 : Math.max(1, toNumber(extra.maxRanks, 1));
          const value = clamp(toNumber(raw, 1), 1, hi);
          extra[fieldKey] = value;
          return { kind: 'num', field: fieldKey, label: label, value: value, lo: 1, hi: hi };
        }
        return { kind: 'text', field: fieldKey, label: label, value: raw || '' };
      });
  }

  Sheet.renderStandaloneItemDialog = function renderStandaloneItemDialog() {
    const dialog = Sheet.ui.itemDialog;
    if (!dialog) return;
    const extra = dialog.extra || {};
    const isEquipment = dialog.section === 'Equipment';
    const isLibrary = dialog.mode === 'library';
    const existingId = isLibrary ? dialog.libraryId : dialog.instanceId;
    const titlePrefix = isLibrary ? 'CODEX ITEM' : 'ITEM';

    let html = '<div class="panel-header"><div class="title">' + (existingId ? 'EDIT ' + titlePrefix : 'NEW ' + titlePrefix) + '</div></div>';

    if (isLibrary) {
      html += '<div class="col"><span class="label">GROUP</span><select class="field" id="dialogGroup">'
        + '<option value="">' + escapeHtml(Sheet.DEFAULT_GROUP_NAME) + '</option>'
        + (Sheet.groups || []).map((group) => '<option value="' + group.id + '"' + (dialog.groupId === group.id ? ' selected' : '') + '>' + escapeHtml(group.name) + '</option>').join('')
        + '</select></div>';
    }

    html += '<div class="dialog-row"><div class="col" style="flex:8 1 0"><label class="label" for="dialogName">NAME</label>'
      + '<input class="field" id="dialogName" value="' + escapeHtml(dialog.name) + '"></div>'
      + (isEquipment ? '<div class="col" style="flex:2 1 90px"><label class="label" for="dialogCost">COST</label>'
          + '<input class="field mono" id="dialogCost" data-dialog-field="cost" inputmode="numeric" value="' + escapeHtml(extra.cost || '') + '"></div>' : '')
      + '</div>';

    if (isEquipment && !existingId && !dialog.lockedType) {
      const noWeapons = !isLibrary && Sheet.weaponOptions().length === 0;
      html += '<div class="col"><span class="label">TYPE</span><div class="chips">'
        + Sheet.EQUIPMENT_TYPES.map(([type, label]) => {
            const disabled = type === 'attachment' && noWeapons;
            return '<button class="chip' + ((extra.type === type && !disabled) ? ' selected' : '') + '" data-action="dlgType" data-type="' + type + '"'
              + (disabled ? ' disabled' : '') + '>' + label + '</button>';
          }).join('')
        + '</div></div>';
    }
    if (isEquipment && ['throwable', 'utility'].indexOf(extra.type) >= 0) {
      html += '<button class="check' + (Sheet.isSingleUse(extra) ? ' selected' : '') + '" data-action="dlgSingle">'
        + '<span class="checkbox-box">' + (Sheet.isSingleUse(extra) ? '✕' : '') + '</span>'
        + '<span class="label">SINGLE-USE</span></button>';
    }

    const fields = buildDialogFields();
    if (fields.length) {
      html += '<div class="dialog-row">' + fields.map((field) => {
        let inner = '';
        if (field.kind === 'text') {
          inner = '<input class="field" data-dialog-field="' + field.field + '" value="' + escapeHtml(field.value) + '">';
        } else if (field.kind === 'select') {
          inner = '<select class="field" data-dialog-field="' + field.field + '">'
            + field.options.map((option) => '<option value="' + escapeHtml(option.value) + '"' + (option.value === field.value ? ' selected' : '') + '>' + escapeHtml(option.label) + '</option>').join('')
            + '</select>';
        } else if (field.kind === 'num') {
          inner = '<div class="step tight">'
            + '<button data-action="dlgStep" data-key="' + field.field + '" data-delta="-1" data-min="' + field.lo + '" data-max="' + field.hi + '">−</button>'
            + '<div class="step-value">' + field.value + '</div>'
            + '<button data-action="dlgStep" data-key="' + field.field + '" data-delta="1" data-min="' + field.lo + '" data-max="' + field.hi + '">+</button></div>';
        } else if (field.kind === 'rank') {
          inner = '<div style="display:flex;align-items:center;gap:14px">'
            + '<div class="step tight">'
            + '<button data-action="dlgStep" data-key="' + field.field + '" data-delta="-1" data-min="1" data-max="6">−</button>'
            + '<div class="step-value">' + field.value + '</div>'
            + '<button data-action="dlgStep" data-key="' + field.field + '" data-delta="1" data-min="1" data-max="6">+</button></div>'
            + '<div class="die-output">' + Sheet.rankToDieLabel(field.value) + '</div></div>';
        }
        return '<div class="col"><span class="label">' + field.label + '</span>' + inner + '</div>';
      }).join('') + '</div>';
    }

    html += '<div class="col"><label class="label" for="dialogNotes">'
      + ((dialog.section === 'Cybernetics' || isEquipment) ? 'SPECIAL' : 'DESCRIPTION') + '</label>'
      + '<textarea class="field" id="dialogNotes" style="min-height:140px">' + escapeHtml(dialog.notes) + '</textarea></div>';

    if (dialog.section === 'SpecialtySkills') {
      const rankCount = clamp(toNumber(extra.maxRanks, 1), 1, 5);
      if (rankCount >= 2) {
        for (let i = 1; i <= rankCount; i++) {
          html += '<div class="col"><span class="label">RANK ' + i + '</span>'
            + '<textarea class="field" data-dialog-field="r' + i + '" style="min-height:64px">' + escapeHtml(extra['r' + i] || '') + '</textarea></div>';
        }
      }
    }

    if (!isLibrary && isEquipment && dialog.instanceId) {
      const otherLoadouts = (Sheet.state.loadouts || []).filter((loadout) => loadout.id !== Sheet.state.activeLoadoutId);
      if (otherLoadouts.length) {
        html += '<div class="col"><span class="label">COPY TO LOADOUT</span>'
          + '<div style="display:flex;gap:8px">'
          + '<select class="field" id="dialogCopyTarget">' + otherLoadouts.map((loadout) => '<option value="' + loadout.id + '">' + escapeHtml(loadout.name) + '</option>').join('')
          + '</select>'
          + '<button class="btn small" data-action="dlgCopyToLoadout" type="button">COPY</button>'
          + '</div></div>';
      }
    }

    html += '<div class="dialog-footer">'
      + (!isLibrary && dialog.instanceId ? '<button class="btn small" data-action="dlgPromote" type="button" style="margin-right:auto">SAVE TO CODEX</button>' : '')
      + '<button class="btn ghost" data-action="dlgCancel">CANCEL</button>'
      + '<button class="btn primary" data-action="dlgSave">SAVE</button></div>';

    query('#dialog').className = 'dialog';
    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
    const nameEl = query('#dialogName');
    if (nameEl && !existingId) nameEl.focus();
  };

  Sheet.saveStandaloneItemDialog = function saveStandaloneItemDialog() {
    Sheet.collectStandaloneDialogInputs();
    const dialog = Sheet.ui.itemDialog;
    if (!dialog) return;
    const name = (dialog.name || '').trim();
    if (!name) { Sheet.closeStandaloneItemDialog(); return; }

    const extra = dialog.extra || {};
    if (dialog.section === 'Equipment' && extra.type === 'attachment' && dialog.mode === 'character') {
      const options = Sheet.weaponOptions();
      if (!options.some((option) => option.value === extra.fittedId)) {
        if (!options.length) { Sheet.closeStandaloneItemDialog(); return; }
        extra.fittedId = options[0].value;
      }
    }

    if (dialog.mode === 'library') {
      const library = Sheet.library[dialog.section] || [];
      let savedId = dialog.libraryId;
      if (dialog.libraryId) {
        Sheet.library[dialog.section] = library.map((item) => item.id === dialog.libraryId
          ? { ...item, name: name, notes: dialog.notes || '', groupId: dialog.groupId || null, ...extra }
          : item);
      } else {
        savedId = Sheet.generateId();
        Sheet.library[dialog.section] = library.concat([{ id: savedId, name: name, notes: dialog.notes || '', groupId: dialog.groupId || null, ...extra }]);
      }
      Sheet.persistLibrary();

      const fromPicker = dialog.fromPicker;
      const section = dialog.section;
      Sheet.closeStandaloneItemDialog();

      if (fromPicker) {
        const instance = Sheet.applyPickedLibraryItem(section, savedId);
        Sheet.ui.pickerDialog = null;
        if (instance) Sheet.openInstanceDialogIfConfigurable(section, instance.instanceId);
      } else if (Sheet.renderLibraryView) {
        Sheet.renderLibraryView();
      }
      return;
    }

    const list = (Sheet.state.items[dialog.section] || []).slice();
    if (dialog.instanceId) {
      const index = list.findIndex((instance) => instance.instanceId === dialog.instanceId);
      if (index >= 0) list[index] = { ...list[index], name: name, notes: dialog.notes || '', extra: extra };
    } else {
      const newInstance = { instanceId: Sheet.generateId(), libraryId: null, name: name, notes: dialog.notes || '', extra: extra };
      if (dialog.section === 'Equipment') newInstance.extra.loadoutId = Sheet.state.activeLoadoutId;
      list.push(newInstance);
    }
    Sheet.state.items[dialog.section] = list;

    Sheet.closeStandaloneItemDialog();
    Sheet.persistCharacterState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };

  Sheet.promoteStandaloneDialogToLibrary = function promoteStandaloneDialogToLibrary() {
    Sheet.collectStandaloneDialogInputs();
    const dialog = Sheet.ui.itemDialog;
    if (!dialog || dialog.mode !== 'character' || !dialog.instanceId) return;
    const list = Sheet.state.items[dialog.section] || [];
    const index = list.findIndex((instance) => instance.instanceId === dialog.instanceId);
    if (index < 0) return;
    list[index] = { ...list[index], name: (dialog.name || '').trim() || list[index].name, notes: dialog.notes || '', extra: dialog.extra };
    Sheet.state.items[dialog.section] = list;
    Sheet.promoteInstanceToLibrary(dialog.section, dialog.instanceId, null);
    Sheet.closeStandaloneItemDialog();
    Sheet.persistCharacterState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };

  Sheet.copyItemToLoadout = function copyItemToLoadout(button) {
    const dialog = Sheet.ui.itemDialog;
    if (!dialog || dialog.mode !== 'character' || dialog.section !== 'Equipment' || !dialog.instanceId) return;
    if (button && button.disabled) return;
    Sheet.collectStandaloneDialogInputs();
    const targetSelect = query('#dialogCopyTarget');
    const targetLoadoutId = targetSelect ? targetSelect.value : '';
    if (!targetLoadoutId) return;

    const name = (dialog.name || '').trim();
    if (!name) return;

    const extra = { ...(dialog.extra || {}), loadoutId: targetLoadoutId };
    const newInstance = { instanceId: Sheet.generateId(), libraryId: null, name: name, notes: dialog.notes || '', extra: extra };
    const copies = [newInstance];

    if (extra.type !== 'attachment') {
      Sheet.resolveSectionItems('Equipment').filter((item) => Sheet.isAttachment(item) && item.extra.fittedId === dialog.instanceId)
        .forEach((attachment) => {
          copies.push({ instanceId: Sheet.generateId(), libraryId: null, name: attachment.name, notes: attachment.notes || '', extra: { ...attachment.extra, loadoutId: targetLoadoutId, fittedId: newInstance.instanceId } });
        });
    }

    Sheet.state.items.Equipment = (Sheet.state.items.Equipment || []).concat(copies);
    Sheet.persistCharacterState();
    Sheet.renderItemSections();
    Sheet.renderTotals();

    if (button) {
      button.disabled = true;
      button.textContent = 'COPIED';
      setTimeout(() => { button.disabled = false; button.textContent = 'COPY'; }, 1200);
    }
  };
})(window.Sheet = window.Sheet || {});

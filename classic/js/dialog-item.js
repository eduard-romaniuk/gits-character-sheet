(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;
  const toNumber = Sheet.toNumber;
  const clamp = Sheet.clamp;

  Sheet.openItemDialog = function openItemDialog(sectionKey, item) {
    const extra = item && item.extra ? { ...item.extra } : {};
    if (sectionKey === 'Equipment' && !extra.type) extra.type = 'weapon';
    Sheet.state.dialog = { section: sectionKey, id: item ? item.id : null, name: item ? item.name : '', notes: item ? (item.notes || '') : '', extra: extra };
    Sheet.renderItemDialog();
  };

  Sheet.closeItemDialog = function closeItemDialog() {
    Sheet.state.dialog = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  };

  Sheet.collectDialogInputs = function collectDialogInputs() {
    const dialog = Sheet.state.dialog;
    if (!dialog) return;
    const nameEl = query('#dialogName');
    const notesEl = query('#dialogNotes');
    if (nameEl) dialog.name = nameEl.value;
    if (notesEl) dialog.notes = notesEl.value;
    Array.prototype.forEach.call(query('#dialog').querySelectorAll('[data-dialog-field]'), (el) => {
      dialog.extra[el.getAttribute('data-dialog-field')] = el.value;
    });
  };

  function buildDialogFields() {
    const dialog = Sheet.state.dialog;
    const extra = dialog.extra || {};
    if (dialog.section === 'Equipment') {
      const type = extra.type || 'weapon';
      return (Sheet.EQUIPMENT_FIELDS[type] || [])
        .filter(([fieldKey]) => fieldKey !== 'cost' && (fieldKey !== 'qty' || Sheet.isSingleUse(extra)))
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
    return (Sheet.ITEM_FIELD_SCHEMA[dialog.section] || []).map(([fieldKey, label, kind]) => {
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

  Sheet.renderItemDialog = function renderItemDialog() {
    const dialog = Sheet.state.dialog;
    if (!dialog) return;
    const extra = dialog.extra || {};
    const isEquipment = dialog.section === 'Equipment';

    let html = '<div class="panel-header"><div class="title">' + (dialog.id ? 'EDIT ITEM' : 'NEW ITEM') + '</div></div>'
      + '<div class="dialog-row"><div class="col" style="flex:8 1 0"><label class="label" for="dialogName">NAME</label>'
      + '<input class="field" id="dialogName" value="' + escapeHtml(dialog.name) + '"></div>'
      + (isEquipment ? '<div class="col" style="flex:2 1 90px"><label class="label" for="dialogCost">COST</label>'
          + '<input class="field mono" id="dialogCost" data-dialog-field="cost" inputmode="numeric" value="' + escapeHtml(extra.cost || '') + '"></div>' : '')
      + '</div>';

    if (isEquipment && !dialog.id) {
      const noWeapons = Sheet.weaponOptions().length === 0;
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
    if (isEquipment && dialog.id) {
      const otherLoadouts = (Sheet.state.loadouts || []).filter((loadout) => loadout.id !== Sheet.state.activeLoadoutId);
      if (otherLoadouts.length) {
        html += '<div class="col"><span class="label">COPY TO LOADOUT</span>'
          + '<div style="display:flex;gap:8px">'
          + '<select class="field" id="dialogCopyTarget">' + otherLoadouts.map((loadout) => '<option value="' + loadout.id + '">' + escapeHtml(loadout.name) + '</option>').join('') + '</select>'
          + '<button class="btn small" data-action="dlgCopyToLoadout" type="button">COPY</button>'
          + '</div></div>';
      }
    }

    html += '<div class="dialog-footer"><button class="btn ghost" data-action="dlgCancel">CANCEL</button>'
      + '<button class="btn primary" data-action="dlgSave">SAVE</button></div>';

    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
    const nameEl = query('#dialogName');
    if (nameEl && !dialog.id) nameEl.focus();
  };

  Sheet.saveItemDialog = function saveItemDialog() {
    Sheet.collectDialogInputs();
    const dialog = Sheet.state.dialog;
    if (!dialog) return;
    const name = (dialog.name || '').trim();
    if (!name) { Sheet.closeItemDialog(); return; }

    const extra = dialog.extra || {};
    if (dialog.section === 'Equipment' && extra.type === 'attachment') {
      const options = Sheet.weaponOptions();
      if (!options.some((option) => option.value === extra.fittedId)) {
        if (!options.length) { Sheet.closeItemDialog(); return; }
        extra.fittedId = options[0].value;
      }
    }

    const list = (Sheet.state.items[dialog.section] || []).slice();
    if (dialog.id) {
      const index = list.findIndex((item) => item.id === dialog.id);
      if (index >= 0) list[index] = { ...list[index], name: name, notes: dialog.notes || '', extra: extra };
    } else {
      const newItem = { id: Sheet.generateId(), name: name, notes: dialog.notes || '', extra: extra };
      if (dialog.section === 'Equipment') newItem.loadoutId = Sheet.state.activeLoadoutId;
      list.push(newItem);
    }
    Sheet.state.items[dialog.section] = list;

    Sheet.closeItemDialog();
    Sheet.persistState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };

  Sheet.copyItemToLoadout = function copyItemToLoadout(button) {
    const dialog = Sheet.state.dialog;
    if (!dialog || dialog.section !== 'Equipment' || !dialog.id) return;
    if (button && button.disabled) return;
    Sheet.collectDialogInputs();
    const targetSelect = query('#dialogCopyTarget');
    const targetLoadoutId = targetSelect ? targetSelect.value : '';
    if (!targetLoadoutId) return;

    const name = (dialog.name || '').trim();
    if (!name) return;

    const extra = { ...(dialog.extra || {}) };
    const newId = Sheet.generateId();
    const copies = [{ id: newId, name: name, notes: dialog.notes || '', extra: extra, loadoutId: targetLoadoutId }];

    if (extra.type !== 'attachment') {
      (Sheet.state.items.Equipment || []).filter((item) => Sheet.isAttachment(item) && (item.extra || {}).fittedId === dialog.id)
        .forEach((attachment) => {
          copies.push({ id: Sheet.generateId(), name: attachment.name, notes: attachment.notes || '', extra: { ...(attachment.extra || {}), fittedId: newId }, loadoutId: targetLoadoutId });
        });
    }

    Sheet.state.items.Equipment = (Sheet.state.items.Equipment || []).concat(copies);
    Sheet.persistState();
    Sheet.renderItemSections();
    Sheet.renderTotals();

    if (button) {
      button.disabled = true;
      button.textContent = 'COPIED';
      setTimeout(() => { button.disabled = false; button.textContent = 'COPY'; }, 1200);
    }
  };
})(window.Sheet = window.Sheet || {});

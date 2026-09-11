(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;
  const toNumber = Sheet.toNumber;
  const clamp = Sheet.clamp;

  Sheet.openInstanceDialog = function openInstanceDialog(section, instanceId) {
    const raw = (Sheet.state.items[section] || []).find((i) => i.instanceId === instanceId);
    if (!raw) return;
    const resolved = Sheet.resolveItem(section, raw);
    if (!resolved) return;
    Sheet.state.instanceDialog = {
      section: section, instanceId: instanceId,
      name: resolved.name, notes: resolved.notes, defExtra: resolved.extra, overlay: { ...(raw.overlay || {}) },
    };
    Sheet.renderInstanceDialog();
  };

  Sheet.closeInstanceDialog = function closeInstanceDialog() {
    Sheet.state.instanceDialog = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  };

  function buildOverlayFields(dialog) {
    const section = dialog.section;
    const overlay = dialog.overlay;
    const defExtra = dialog.defExtra;
    if (section === 'Skills') {
      const rank = clamp(toNumber(overlay.rank, 1), 1, 6);
      overlay.rank = rank;
      return [{ kind: 'rank', field: 'rank', label: 'RANK', value: rank }];
    }
    if (section === 'SpecialtySkills') {
      const hi = Math.max(1, toNumber(defExtra.maxRanks, 1));
      const rank = clamp(toNumber(overlay.rank, 1), 1, hi);
      overlay.rank = rank;
      return [{ kind: 'num', field: 'rank', label: 'CURRENT RANK (MAX ' + hi + ')', value: rank, lo: 1, hi: hi }];
    }
    if (section === 'Equipment') {
      const fields = [];
      if (defExtra.type === 'attachment') {
        const options = Sheet.weaponOptions();
        const current = overlay.fittedId;
        const valid = options.some((o) => o.value === current) ? current : (options[0] ? options[0].value : '');
        overlay.fittedId = valid;
        fields.push({ kind: 'select', field: 'fittedId', label: 'FITTED TO', value: valid, options: options });
      }
      if (Sheet.isSingleUse(defExtra)) {
        fields.push({ kind: 'text', field: 'qty', label: 'PURCHASED (COSTS RP)', value: overlay.qty || '' });
        fields.push({ kind: 'text', field: 'freeQty', label: 'FREE BONUS (NO COST)', value: overlay.freeQty || '' });
      }
      return fields;
    }
    return [];
  }

  // Whether adding this item to a character leaves anything worth configuring right
  // away — mirrors buildOverlayFields' branch conditions without building the fields.
  Sheet.instanceHasConfigurableFields = function instanceHasConfigurableFields(section, defExtra) {
    if (section === 'Skills' || section === 'SpecialtySkills') return true;
    if (section === 'Equipment') {
      const extra = defExtra || {};
      return extra.type === 'attachment' || Sheet.isSingleUse(extra);
    }
    return false;
  };

  // Opens the overlay-edit dialog for a freshly-added instance, but only when there's
  // actually something to configure (skips plain weapons/armor, Setbacks, Cybernetics).
  Sheet.openInstanceDialogIfConfigurable = function openInstanceDialogIfConfigurable(section, instanceId) {
    const raw = (Sheet.state.items[section] || []).find((i) => i.instanceId === instanceId);
    if (!raw) return;
    const resolved = Sheet.resolveItem(section, raw);
    if (!resolved || !Sheet.instanceHasConfigurableFields(section, resolved.extra)) return;
    Sheet.openInstanceDialog(section, instanceId);
  };

  Sheet.renderInstanceDialog = function renderInstanceDialog() {
    const dialog = Sheet.state.instanceDialog;
    if (!dialog) return;

    let html = '<div class="panel-header"><div class="title">' + escapeHtml(dialog.name) + '</div></div>';

    if (dialog.notes) html += '<div class="col"><span class="label">NOTES</span><div class="dialog-readonly">' + escapeHtml(dialog.notes) + '</div></div>';

    const fields = buildOverlayFields(dialog);
    if (fields.length) {
      html += '<div class="dialog-row">' + fields.map((field) => {
        let inner = '';
        if (field.kind === 'text') {
          inner = '<input class="field mono" data-instance-field="' + field.field + '" inputmode="numeric" value="' + escapeHtml(field.value) + '">';
        } else if (field.kind === 'select') {
          inner = '<select class="field" data-instance-field="' + field.field + '">'
            + field.options.map((option) => '<option value="' + escapeHtml(option.value) + '"' + (option.value === field.value ? ' selected' : '') + '>' + escapeHtml(option.label) + '</option>').join('')
            + '</select>';
        } else if (field.kind === 'num' || field.kind === 'rank') {
          const lo = field.lo != null ? field.lo : 1;
          const hi = field.hi != null ? field.hi : 6;
          inner = '<div style="display:flex;align-items:center;gap:14px">'
            + '<div class="step tight">'
            + '<button data-action="dlgInstanceStep" data-key="' + field.field + '" data-delta="-1" data-min="' + lo + '" data-max="' + hi + '">−</button>'
            + '<div class="step-value">' + field.value + '</div>'
            + '<button data-action="dlgInstanceStep" data-key="' + field.field + '" data-delta="1" data-min="' + lo + '" data-max="' + hi + '">+</button></div>'
            + (field.kind === 'rank' ? '<div class="die-output">' + Sheet.rankToDieLabel(field.value) + '</div>' : '') + '</div>';
        }
        return '<div class="col"><span class="label">' + field.label + '</span>' + inner + '</div>';
      }).join('') + '</div>';
      if (fields.some((field) => field.field === 'freeQty')) {
        html += '<div class="hint">CARRIED AMOUNT = PURCHASED + FREE BONUS. </br>ONLY PURCHASED COUNTS TOWARD REQUISITION POINTS.</div>';
      }
    }

    html += '<div class="dialog-footer">'
      + '<button class="btn small ghost" data-action="dlgInstanceRemove" type="button" style="margin-right:auto">REMOVE FROM CHARACTER</button>'
      + '<button class="btn ghost" data-action="dlgCancel">CANCEL</button>'
      + '<button class="btn primary" data-action="dlgSave">SAVE</button></div>';

    query('#dialog').className = 'dialog';
    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
  };

  Sheet.collectInstanceDialogInputs = function collectInstanceDialogInputs() {
    const dialog = Sheet.state.instanceDialog;
    if (!dialog) return;
    Array.prototype.forEach.call(query('#dialog').querySelectorAll('[data-instance-field]'), (el) => {
      dialog.overlay[el.getAttribute('data-instance-field')] = el.value;
    });
  };

  Sheet.saveInstanceDialog = function saveInstanceDialog() {
    Sheet.collectInstanceDialogInputs();
    const dialog = Sheet.state.instanceDialog;
    if (!dialog) return;
    Object.keys(dialog.overlay).forEach((field) => { Sheet.setInstanceField(dialog.section, dialog.instanceId, field, dialog.overlay[field]); });
    Sheet.closeInstanceDialog();
    Sheet.persistCharacterState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };

  Sheet.removeInstanceDialog = function removeInstanceDialog() {
    const dialog = Sheet.state.instanceDialog;
    if (!dialog) return;
    Sheet.closeInstanceDialog();
    Sheet.deleteItemEntry(dialog.section, dialog.instanceId);
  };
})(window.Sheet = window.Sheet || {});

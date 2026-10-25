(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;

  // EXPORT ▸ ROLL20: one loadout of the open character as JSON already in the Roll20
  // sheet's own field names (roll20/template.html), copied to the clipboard and pasted
  // into the Roll20 sheet's SETTINGS ▸ IMPORT. The Roll20 import replaces its whole sheet.
  // Left out on purpose — Roll20 has its own fields for them: agent name/ID, player name,
  // backstory, portrait (name is only sent for the import's status line).

  const TOP_LEVEL_KEYS = ['Awarness', 'Presence', 'Muscle', 'Reflexes', 'Hacking', 'Barrier',
    'GW1', 'GW2', 'SP2', 'RP2', 'Aspect1', 'Aspect2', 'SC_Notes', 'Notes'];

  const text = (value) => (value == null ? '' : String(value));

  function buildAttrs() {
    const data = Sheet.state.data || {};
    const hp = Sheet.state.hp || {};
    const sc = Sheet.state.sc || {};
    const attrs = {};
    TOP_LEVEL_KEYS.forEach((key) => { attrs[key] = text(data[key]); });
    Sheet.HIT_LOCATIONS.forEach(([, , key, boxes]) => {
      attrs[key + '_Armor'] = text(data[key + '_Armor']);
      for (let index = 0; index < boxes; index++) attrs['hp_' + key + '_' + index] = text(hp[key + ':' + index]);
    });
    Sheet.CONFLICT_ROWS.forEach((size) => {
      attrs['sc_L' + size] = text(sc['L' + size]);
      attrs['sc_R' + size] = text(sc['R' + size]);
    });
    return attrs;
  }

  function equipmentRow(item, weaponsById) {
    const extra = item.extra;
    const type = extra.type || 'weapon';
    const fittedTo = type === 'attachment' && weaponsById[extra.fittedId];
    return {
      type: type, name: item.name, notes: item.notes,
      cost: text(extra.cost), range: text(extra.range), rof: text(extra.rof), skill: text(extra.skill),
      damage: Sheet.DAMAGE_DICE.indexOf(extra.damage) >= 0 ? extra.damage.toLowerCase() : '',
      attack: type === 'weapon' && extra.attack === 'melee' ? 'melee' : 'ranged',
      head: text(extra.head), torso: text(extra.torso), arms: text(extra.arms), legs: text(extra.legs), mods: text(extra.mods),
      qty: text(extra.qty), freeqty: text(extra.freeQty), used: text(extra.used),
      single: Sheet.isSingleUse(extra) ? 'on' : '',
      explosive: (type === 'weapon' || type === 'throwable') && extra.explosive ? '1' : '',
      fittedto: fittedTo ? fittedTo.name : '',
    };
  }

  Sheet.buildRoll20Character = function buildRoll20Character(loadoutId) {
    const loadout = (Sheet.state.loadouts || []).find((entry) => entry.id === loadoutId) || {};
    const equipment = Sheet.resolveSectionItems('Equipment').filter((item) => item.extra.loadoutId === loadoutId);
    const weaponsById = {};
    equipment.forEach((item) => { weaponsById[item.instanceId] = item; });
    const rows = (section, map) => Sheet.resolveSectionItems(section).map(map);
    return {
      format: 'gits-roll20', version: 1,
      name: text(Sheet.state.data.AgentName), loadout: text(loadout.name),
      attrs: buildAttrs(),
      rows: {
        setbacks: rows('Setbacks', (item) => ({ name: item.name, notes: item.notes })),
        cybernetics: rows('Cybernetics', (item) => ({ name: item.name, notes: item.notes, armor: text(item.extra.armor), damage: text(item.extra.damage) })),
        skills: rows('Skills', (item) => ({ name: item.name, notes: item.notes, rank: text(item.extra.rank || 1), linked: text(item.extra.linked) })),
        specialty: rows('SpecialtySkills', (item) => {
          const row = { name: item.name, notes: item.notes, maxranks: text(item.extra.maxRanks || 1), rank: text(item.extra.rank || 1) };
          for (let rank = 1; rank <= 5; rank++) row['r' + rank] = text(item.extra['r' + rank]);
          return row;
        }),
        equipment: equipment.map((item) => equipmentRow(item, weaponsById)),
      },
    };
  };

  /* ==================== dialog ==================== */

  function renderRoll20Dialog() {
    const dialog = Sheet.ui.roll20Dialog;
    if (!dialog) return;
    const loadouts = Sheet.state.loadouts || [];
    let html = '<div class="panel-header"><div class="title">EXPORT TO ROLL20</div></div>';

    if (dialog.json) {
      // Clipboard unavailable or refused: let the user copy it by hand.
      html += '<div class="col"><span class="label">COPY THIS TEXT (CTRL+C), THEN PASTE IT INTO ROLL20</span>'
        + '<textarea class="field mono" id="roll20Json" readonly style="min-height:200px">' + escapeHtml(dialog.json) + '</textarea></div>'
        + '<div class="dialog-footer"><button class="btn primary" data-action="dlgCancel">CLOSE</button></div>';
    } else if (dialog.copied) {
      html += '<p>Copied. In Roll20, open the character\'s SETTINGS tab, paste into IMPORT and press IMPORT.</p>'
        + '<div class="dialog-footer"><button class="btn primary" data-action="dlgCancel">CLOSE</button></div>';
    } else {
      // Only shown with more than one loadout (see openRoll20ExportDialog).
      html += '<div class="col"><span class="label">LOADOUT</span>'
        + loadouts.map((loadout) => '<button class="check' + (loadout.id === dialog.loadoutId ? ' selected' : '') + '" data-action="roll20Loadout" data-loadout-id="' + loadout.id + '">'
          + '<span class="checkbox-box">' + (loadout.id === dialog.loadoutId ? '✕' : '') + '</span>'
          + '<span class="label">' + escapeHtml(loadout.name) + '</span></button>').join('')
        + '</div>'
        + '<div class="dialog-footer"><button class="btn" data-action="dlgCancel">CANCEL</button>'
        + '<button class="btn primary" data-action="roll20Copy">COPY FOR ROLL20</button></div>';
    }

    query('#dialog').className = 'dialog';
    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
    const jsonEl = query('#roll20Json');
    if (jsonEl) { jsonEl.focus(); jsonEl.select(); }
  }

  Sheet.openRoll20ExportDialog = function openRoll20ExportDialog() {
    if (!Sheet.state) return;
    Sheet.ui.roll20Dialog = { loadoutId: Sheet.state.activeLoadoutId, copied: false, json: null };
    // Nothing to choose with a single loadout: copy straight away (still inside the menu
    // click, so the browser allows the clipboard write); the dialog only reports the result.
    if ((Sheet.state.loadouts || []).length > 1) renderRoll20Dialog();
    else Sheet.copyRoll20Export();
  };

  Sheet.closeRoll20ExportDialog = function closeRoll20ExportDialog() {
    Sheet.ui.roll20Dialog = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  };

  Sheet.selectRoll20Loadout = function selectRoll20Loadout(loadoutId) {
    if (!Sheet.ui.roll20Dialog) return;
    Sheet.ui.roll20Dialog.loadoutId = loadoutId;
    renderRoll20Dialog();
  };

  Sheet.copyRoll20Export = function copyRoll20Export() {
    const dialog = Sheet.ui.roll20Dialog;
    if (!dialog) return;
    const json = JSON.stringify(Sheet.buildRoll20Character(dialog.loadoutId));
    let settled = false;
    const showFallback = () => {
      if (settled || Sheet.ui.roll20Dialog !== dialog) return;
      settled = true;
      dialog.json = json;
      renderRoll20Dialog();
    };
    if (!navigator.clipboard || !navigator.clipboard.writeText) { showFallback(); return; }
    // A browser can also leave the write pending (e.g. waiting on a permission it never asks for).
    setTimeout(showFallback, 2000);
    navigator.clipboard.writeText(json).then(() => {
      if (settled || Sheet.ui.roll20Dialog !== dialog) return;
      settled = true;
      dialog.copied = true;
      renderRoll20Dialog();
    }, showFallback);
  };
})(window.Sheet = window.Sheet || {});

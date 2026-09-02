(function () {
  'use strict';

  const STORAGE_KEY = 'gits-character-sheet-v1';
  const DICE_STEPS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  const RANK_DIE_LABELS = ['D4', 'D6', 'D8', 'D10', 'D12', 'D20'];
  const ITEM_SECTIONS = [
    ['Setbacks', 'SETBACKS'],
    ['Cybernetics', 'CYBERNETICS'],
    ['Skills', 'STANDARD SKILLS'],
    ['SpecialtySkills', 'SPECIALTY SKILLS'],
    ['Equipment', 'WEAPONS & EQUIPMENT'],
  ];
  const ITEM_FIELD_SCHEMA = {
    Cybernetics: [['armor', 'ARMOR'], ['damage', 'UNARMED DAMAGE']],
    Skills: [['rank', 'RANK', 'rank']],
    SpecialtySkills: [['maxRanks', 'MAX. RANKS', 'max'], ['rank', 'CURRENT RANK', 'cur']],
  };
  const EQUIPMENT_TYPES = [
    ['weapon', 'WEAPON'],
    ['attachment', 'ATTACHMENT'],
    ['armor', 'ARMOR'],
    ['throwable', 'THROWABLE'],
    ['utility', 'UTILITY'],
  ];
  const EQUIPMENT_FIELDS = {
    weapon: [['range', 'RANGE'], ['damage', 'DAMAGE'], ['rof', 'ROF'], ['cost', 'COST'], ['skill', 'SKILL']],
    armor: [['head', 'HEAD'], ['torso', 'TORSO'], ['arms', 'ARMS'], ['legs', 'LEGS'], ['cost', 'COST']],
    throwable: [['range', 'RANGE'], ['damage', 'DAMAGE'], ['qty', 'AMOUNT'], ['cost', 'COST'], ['skill', 'SKILL']],
    utility: [['cost', 'COST'], ['qty', 'AMOUNT']],
    attachment: [['mods', 'STAT MODIFIER'], ['cost', 'COST'], ['fittedId', 'FITTED TO', 'weapon']],
  };
  const META_LABEL_PREFIX = {
    range: 'RANGE', damage: 'DMG', rof: 'ROF', cost: 'COST',
    head: 'HEAD', torso: 'TORSO', arms: 'ARMS', legs: 'LEGS',
  };
  const ATTRIBUTE_GROUPS = [
    ['GHOST', [['Awarness', 'AWARENESS'], ['Presence', 'PRESENCE']]],
    ['SHELL', [['Muscle', 'MUSCLE'], ['Reflexes', 'REFLEXES']]],
  ];
  const HIT_LOCATIONS = [
    ['Head / Neck', '19–20', 'Head', 2],
    ['Torso', '11–18', 'Torso', 4],
    ['Left Arm', '7–8', 'LeftArm', 3],
    ['Right Arm', '9–10', 'RightArm', 3],
    ['Left Leg', '1–3', 'LeftLeg', 3],
    ['Right Leg', '4–6', 'RightLeg', 3],
  ];
  const CONFLICT_ROWS = ['12', '10', '8', '6'];
  const MARK_STATES = ['', 'temp', 'perm'];
  const HIT_LETHAL_STATES = ['', 'temp', 'perm'];
  const HIT_NONLETHAL_STATES = ['', 'stun-temp', 'stun-perm'];
  const TEXT_FIELD_KEYS = ['AgentName', 'PlayerName', 'BackStory', 'Aspect1', 'Aspect2', 'SC_Notes', 'GW1', 'GW2', 'SP2', 'RP2', 'Notes'];

  const query = (selector, root) => (root || document).querySelector(selector);
  const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  const toNumber = (value, fallback) => { const n = Number(value); return isFinite(n) ? n : (fallback || 0); };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  /* ==================== state ==================== */

  let state;

  function loadState() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (error) { saved = {}; }

    const data = saved.data || {};
    ['Awarness', 'Presence', 'Muscle', 'Reflexes', 'Hacking'].forEach((key) => { if (!data[key]) data[key] = 'd6'; });
    if (!data.Barrier) data.Barrier = 6;
    ['GW1', 'GW2'].forEach((key) => { if (data[key] == null) data[key] = '4'; });
    ['SP2', 'RP2'].forEach((key) => { if (data[key] == null) data[key] = '12'; });

    const items = saved.items || {};
    ITEM_SECTIONS.forEach(([sectionKey]) => {
      if (!items[sectionKey]) {
        const legacy = String(data[sectionKey] || '').split('\n').map((line) => line.trim()).filter(Boolean);
        items[sectionKey] = legacy.map((name, index) => ({ id: 'm' + index + '-' + sectionKey, name: name, notes: '' }));
      }
    });
    items.Equipment = (items.Equipment || []).map((item) => {
      const extra = item.extra || {};
      if (extra.qty !== undefined && extra.qty !== '' && extra.single === undefined) return { ...item, extra: { ...extra, single: true } };
      return item;
    });

    return {
      data: data,
      hp: saved.hp || {},
      sc: saved.sc || {},
      scOpen: saved.scOpen !== false,
      items: items,
      openRows: saved.openRows || {},
      sectionAllOpen: {},
      portrait: saved.portrait || '',
      dialog: null,
      crop: null,
    };
  }

  let persistTimer;
  function persistState() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          data: state.data, hp: state.hp, sc: state.sc, scOpen: state.scOpen,
          items: state.items, openRows: state.openRows, portrait: state.portrait,
        }));
      } catch (error) {}
    }, 250);
  }

  /* ==================== derived ==================== */

  const isAttachment = (item) => (item.extra || {}).type === 'attachment';
  const isSingleUse = (extra) => { const e = extra || {}; return e.single === undefined ? (e.qty !== undefined && e.qty !== '') : !!e.single; };
  const rankToDieLabel = (rank) => RANK_DIE_LABELS[clamp(toNumber(rank, 1), 1, 6) - 1];
  const generateId = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const weaponOptions = () => (state.items.Equipment || [])
    .filter((item) => ((item.extra || {}).type || 'weapon') === 'weapon')
    .map((item) => ({ value: item.id, label: item.name }));

  function orderItemsForDisplay(sectionKey, list) {
    if (sectionKey !== 'Equipment') return list;
    const attachments = list.filter(isAttachment);
    const out = [];
    list.filter((item) => !isAttachment(item)).forEach((weapon) => {
      out.push(weapon);
      attachments.forEach((attachment) => { if ((attachment.extra || {}).fittedId === weapon.id) out.push(attachment); });
    });
    attachments.forEach((attachment) => { if (out.indexOf(attachment) < 0) out.push(attachment); });
    return out;
  }

  const skillPointsTotal = () => (state.items.Skills || []).reduce((sum, item) => sum + toNumber((item.extra || {}).rank, 0), 0)
    + (state.items.SpecialtySkills || []).reduce((sum, item) => sum + toNumber((item.extra || {}).rank, 0), 0);

  const requisitionPointsTotal = () => (state.items.Equipment || []).reduce((sum, item) => {
    const extra = item.extra || {};
    const units = isSingleUse(extra) ? Math.max(1, toNumber(extra.qty, 1)) : 1;
    return sum + toNumber(extra.cost, 0) * units;
  }, 0);

  /* ==================== render: attributes ==================== */

  function renderStepper(action, dataKey, value) {
    return '<div class="step"><button data-action="' + action + '" data-key="' + dataKey + '" data-delta="-1" aria-label="decrease">−</button>'
      + '<div class="step-value">' + escapeHtml(value) + '</div>'
      + '<button data-action="' + action + '" data-key="' + dataKey + '" data-delta="1" aria-label="increase">+</button></div>';
  }

  function renderAttributes() {
    let html = '';
    ATTRIBUTE_GROUPS.forEach(([name, list]) => {
      html += '<div class="panel"><div class="panel-header"><div class="title">' + name + '</div></div>'
        + '<div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;padding-top:14px">';
      list.forEach(([key, label]) => {
        html += '<div class="col"><span class="label">' + label + '</span>' + renderStepper('die', key, state.data[key] || 'd6') + '</div>';
      });
      html += '</div></div>';
    });
    html += '<div class="panel"><div class="panel-header"><div class="title">CYBERBRAIN</div></div>'
      + '<div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;padding-top:14px">'
      + '<div class="col"><span class="label">HACKING</span>' + renderStepper('die', 'Hacking', state.data.Hacking || 'd6') + '</div>'
      + '<div class="col"><span class="label">BARRIER</span>' + renderStepper('barrier', 'Barrier', toNumber(state.data.Barrier, 6)) + '</div>'
      + '</div></div>';
    query('#attributes').innerHTML = html;
  }

  /* ==================== render: synthesis conflict ==================== */

  function renderConflictTracker() {
    let html = '';
    CONFLICT_ROWS.forEach((size) => {
      html += '<div class="conflict-row">'
        + '<div class="mark left ' + (state.sc['L' + size] || '') + '" data-action="conflict" data-key="L' + size + '" role="button" tabindex="0" aria-label="left ' + size + '"></div>'
        + '<div class="conflict-die">D' + size + '</div>'
        + '<div class="mark right ' + (state.sc['R' + size] || '') + '" data-action="conflict" data-key="R' + size + '" role="button" tabindex="0" aria-label="right ' + size + '"></div>'
        + '</div>';
    });
    html += '<div class="conflict-row"><div class="mark left fixed x"></div><div class="conflict-die">D4</div>'
      + '<div class="mark right fixed x"></div></div>';
    query('#conflictGrid').innerHTML = html;
    query('#conflictNotes').hidden = !state.scOpen;
    query('#conflictToggle').textContent = state.scOpen ? 'HIDE NOTES' : 'NOTES';
  }

  /* ==================== render: hit locations ==================== */

  function renderHitLocations() {
    query('#locations').innerHTML = HIT_LOCATIONS.map(([label, range, key, count]) => {
      let boxes = '';
      for (let index = 0; index < count; index++) {
        const boxKey = key + ':' + index;
        const markState = state.hp[boxKey] || '';
        boxes += '<div class="box ' + markState + '" data-action="hp" data-key="' + boxKey + '" role="button" tabindex="0"'
          + ' aria-label="' + label + ' hit box ' + (index + 1) + '"></div>';
      }
      return '<div class="location">'
        + '<div class="location-header"><div class="location-range">' + range + '</div><div class="location-name">' + label + '</div></div>'
        + '<div class="location-body">'
        + '<div class="col" style="gap:5px"><div class="hint">HIT POINTS</div>'
        + '<div class="boxes">' + boxes + '</div></div>'
        + '<div class="col" style="gap:5px"><div class="hint">ARMOR</div>'
        + '<input class="field armor" data-field="' + key + '_Armor" inputmode="numeric" placeholder="0"'
        + ' value="' + escapeHtml(state.data[key + '_Armor'] || '') + '" aria-label="' + label + ' armor"></div>'
        + '</div></div>';
    }).join('');
  }

  /* ==================== render: item sections ==================== */

  function rowSummaryText(sectionKey, extra) {
    if (sectionKey === 'Equipment') {
      const type = extra.type || 'weapon';
      const typeLabel = ((EQUIPMENT_TYPES.filter((t) => t[0] === type)[0]) || ['', 'WEAPON'])[1];
      const parts = [];
      (EQUIPMENT_FIELDS[type] || []).forEach(([fieldKey]) => {
        if (fieldKey === 'skill' || fieldKey === 'qty' || fieldKey === 'fittedId' || fieldKey === 'cost') return;
        const value = extra[fieldKey];
        if (!value) return;
        const prefix = META_LABEL_PREFIX[fieldKey];
        parts.push(prefix ? prefix + ' ' + value : String(value));
      });
      if (type !== 'attachment') parts.push(typeLabel);
      parts.push(META_LABEL_PREFIX.cost + ' ' + toNumber(extra.cost, 0));
      return parts.join('  ·  ');
    }
    if (sectionKey === 'SpecialtySkills') {
      const maxRank = Math.max(1, toNumber(extra.maxRanks, 1));
      const currentRank = clamp(toNumber(extra.rank, 1), 1, maxRank);
      return 'RANK ' + currentRank + ' / ' + maxRank;
    }
    return (ITEM_FIELD_SCHEMA[sectionKey] || []).map(([fieldKey, , kind]) => {
      const raw = extra[fieldKey];
      if (kind === 'rank') return rankToDieLabel(raw || 1);
      return raw;
    }).filter(Boolean).join('  ·  ');
  }

  function renderSectionMarkup(sectionKey, label) {
    const list = state.items[sectionKey] || [];
    let rows = '';
    orderItemsForDisplay(sectionKey, list).forEach((item) => {
      const extra = item.extra || {};
      const open = !!state.openRows[sectionKey + ':' + item.id];
      const isAttachmentRow = sectionKey === 'Equipment' && isAttachment(item);
      const meta = rowSummaryText(sectionKey, extra);
      const hasQty = sectionKey === 'Equipment' && extra.single !== false && toNumber(extra.qty, 0) > 0;
      const rankLines = sectionKey === 'SpecialtySkills'
        ? Array.from({ length: clamp(toNumber(extra.rank, 1), 1, Math.max(1, toNumber(extra.maxRanks, 1))) }, (_, index) => ({ label: 'Rank ' + (index + 1), text: extra['r' + (index + 1)] || '' }))
            .filter((rankLine) => rankLine.text.trim())
        : [];
      const skill = (sectionKey === 'Equipment' && extra.skill) ? extra.skill : '';
      const body = String(item.notes || '').trim();
      const hasBody = !!(body || rankLines.length || skill);

      rows += '<div class="row-wrap' + (isAttachmentRow ? ' attachment' : '') + '">'
        + '<div class="row" draggable="true" data-section="' + sectionKey + '" data-id="' + item.id + '">'
        + (isAttachmentRow ? '<div class="branch">└</div>' : '')
        + '<button class="chevron" data-action="toggleRow" data-section="' + sectionKey + '" data-id="' + item.id + '"'
        + ' aria-expanded="' + open + '">' + (open ? '▾' : '▸') + '</button>'
        + '<button class="row-name" data-action="toggleRow" data-section="' + sectionKey + '" data-id="' + item.id + '">' + escapeHtml(item.name) + '</button>'
        + (hasQty ? '<div class="quantity">'
            + '<button data-action="quantity" data-section="' + sectionKey + '" data-id="' + item.id + '" data-delta="1" aria-label="restore">−</button>'
            + '<div class="count">' + (Math.max(0, toNumber(extra.qty, 0) - toNumber(extra.used, 0))) + ' / ' + toNumber(extra.qty, 0) + '</div>'
            + '<button data-action="quantity" data-section="' + sectionKey + '" data-id="' + item.id + '" data-delta="-1" aria-label="use">+</button>'
            + '</div>' : '')
        + '<div class="spacer"></div>'
        + (meta ? '<div class="meta">' + escapeHtml(meta) + '</div>' : '')
        + '<button class="icon" data-action="edit" data-section="' + sectionKey + '" data-id="' + item.id + '">EDIT</button>'
        + '<button class="icon delete" data-action="del" data-section="' + sectionKey + '" data-id="' + item.id + '" aria-label="delete">×</button>'
        + '</div>';

      if (hasBody) {
        rows += '<div class="notes"' + (open ? '' : ' style="display:none"') + '>';
        if (skill) rows += '<div class="note-line"><div class="note-key">SKILL</div><div class="note-value">' + escapeHtml(skill) + '</div></div>';
        if (body) rows += '<div class="body">' + escapeHtml(body) + '</div>';
        rankLines.forEach((rankLine) => {
          rows += '<div class="note-line"><div class="note-key">' + escapeHtml(rankLine.label) + '</div><div class="note-value">' + escapeHtml(rankLine.text) + '</div></div>';
        });
        rows += '</div>';
      }
      rows += '</div>';
    });
    if (!rows) rows = '<div class="empty">NOTHING RECORDED</div>';

    return '<div class="panel" style="display:flex;flex-direction:column;gap:12px">'
      + '<div class="panel-header"><div class="title">' + label + '</div>'
      + '<button class="btn small noprint" data-action="toggleAll" data-section="' + sectionKey + '">'
      + (state.sectionAllOpen[sectionKey] ? 'HIDE ALL' : 'SHOW ALL') + '</button></div>'
      + '<div class="rows">' + rows + '</div>'
      + '<button class="btn dashed noprint" data-action="add" data-section="' + sectionKey + '">+ ADD</button></div>';
  }

  function renderItemSections() {
    query('#sectionTop').innerHTML = renderSectionMarkup.apply(null, ITEM_SECTIONS[0]) + renderSectionMarkup.apply(null, ITEM_SECTIONS[1]);
    query('#sectionSkills').innerHTML = renderSectionMarkup.apply(null, ITEM_SECTIONS[2]) + renderSectionMarkup.apply(null, ITEM_SECTIONS[3]);
    query('#sectionGear').innerHTML = renderSectionMarkup.apply(null, ITEM_SECTIONS[4]);
  }

  /* ==================== render: totals ==================== */

  function renderTotals() {
    const skillPoints = skillPointsTotal();
    const requisitionPoints = requisitionPointsTotal();
    const skillPointsEl = query('#skillPointsTotal');
    const requisitionPointsEl = query('#requisitionPointsTotal');
    skillPointsEl.textContent = skillPoints;
    requisitionPointsEl.textContent = requisitionPoints;
    skillPointsEl.classList.toggle('exceeded', toNumber(state.data.SP2, 0) > 0 && skillPoints > toNumber(state.data.SP2, 0));
    requisitionPointsEl.classList.toggle('exceeded', toNumber(state.data.RP2, 0) > 0 && requisitionPoints > toNumber(state.data.RP2, 0));
  }

  /* ==================== render: portrait ==================== */

  function renderPortrait() {
    const portraitEl = query('#portrait');
    portraitEl.classList.toggle('filled', !!state.portrait);
    portraitEl.innerHTML = state.portrait ? '<img alt="Agent portrait" src="' + state.portrait + '">' : 'AGENT<br>PORTRAIT';
  }

  /* ==================== dialog ==================== */

  function openItemDialog(sectionKey, item) {
    const extra = item && item.extra ? { ...item.extra } : {};
    if (sectionKey === 'Equipment' && !extra.type) extra.type = 'weapon';
    state.dialog = { section: sectionKey, id: item ? item.id : null, name: item ? item.name : '', notes: item ? (item.notes || '') : '', extra: extra };
    renderItemDialog();
  }

  function closeItemDialog() {
    state.dialog = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  }

  function collectDialogInputs() {
    const dialog = state.dialog;
    if (!dialog) return;
    const nameEl = query('#dialogName');
    const notesEl = query('#dialogNotes');
    if (nameEl) dialog.name = nameEl.value;
    if (notesEl) dialog.notes = notesEl.value;
    Array.prototype.forEach.call(query('#dialog').querySelectorAll('[data-dialog-field]'), (el) => {
      dialog.extra[el.getAttribute('data-dialog-field')] = el.value;
    });
  }

  function buildDialogFields() {
    const dialog = state.dialog;
    const extra = dialog.extra || {};
    if (dialog.section === 'Equipment') {
      const type = extra.type || 'weapon';
      return (EQUIPMENT_FIELDS[type] || [])
        .filter(([fieldKey]) => fieldKey !== 'cost' && (fieldKey !== 'qty' || isSingleUse(extra)))
        .map(([fieldKey, label, kind]) => {
          if (kind === 'weapon') {
            const options = weaponOptions();
            const current = extra[fieldKey];
            const valid = options.some((option) => option.value === current) ? current : (options[0] ? options[0].value : '');
            return { kind: 'select', field: fieldKey, label: label, value: valid, options: options };
          }
          return { kind: 'text', field: fieldKey, label: label, value: extra[fieldKey] || '' };
        });
    }
    return (ITEM_FIELD_SCHEMA[dialog.section] || []).map(([fieldKey, label, kind]) => {
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

  function renderItemDialog() {
    const dialog = state.dialog;
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
      const noWeapons = weaponOptions().length === 0;
      html += '<div class="col"><span class="label">TYPE</span><div class="chips">'
        + EQUIPMENT_TYPES.map(([type, label]) => {
            const disabled = type === 'attachment' && noWeapons;
            return '<button class="chip' + ((extra.type === type && !disabled) ? ' selected' : '') + '" data-action="dlgType" data-type="' + type + '"'
              + (disabled ? ' disabled' : '') + '>' + label + '</button>';
          }).join('')
        + '</div></div>';
    }
    if (isEquipment && ['throwable', 'utility'].indexOf(extra.type) >= 0) {
      html += '<button class="check' + (isSingleUse(extra) ? ' selected' : '') + '" data-action="dlgSingle">'
        + '<span class="checkbox-box">' + (isSingleUse(extra) ? '✕' : '') + '</span>'
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
            + '<div class="die-output">' + rankToDieLabel(field.value) + '</div></div>';
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
    html += '<div class="dialog-footer"><button class="btn ghost" data-action="dlgCancel">CANCEL</button>'
      + '<button class="btn primary" data-action="dlgSave">SAVE</button></div>';

    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
    const nameEl = query('#dialogName');
    if (nameEl && !dialog.id) nameEl.focus();
  }

  function saveItemDialog() {
    collectDialogInputs();
    const dialog = state.dialog;
    if (!dialog) return;
    const name = (dialog.name || '').trim();
    if (!name) { closeItemDialog(); return; }

    const extra = dialog.extra || {};
    if (dialog.section === 'Equipment' && extra.type === 'attachment') {
      const options = weaponOptions();
      if (!options.some((option) => option.value === extra.fittedId)) {
        if (!options.length) { closeItemDialog(); return; }
        extra.fittedId = options[0].value;
      }
    }

    const list = (state.items[dialog.section] || []).slice();
    if (dialog.id) {
      const index = list.findIndex((item) => item.id === dialog.id);
      if (index >= 0) list[index] = { ...list[index], name: name, notes: dialog.notes || '', extra: extra };
    } else {
      list.push({ id: generateId(), name: name, notes: dialog.notes || '', extra: extra });
    }
    state.items[dialog.section] = list;

    closeItemDialog();
    persistState();
    renderItemSections();
    renderTotals();
  }

  /* ==================== mutations ==================== */

  function stepDie(attributeKey, delta) {
    const index = Math.max(0, DICE_STEPS.indexOf(state.data[attributeKey] || 'd6'));
    state.data[attributeKey] = DICE_STEPS[clamp(index + delta, 0, DICE_STEPS.length - 1)];
    persistState();
    renderAttributes();
  }

  function stepBarrier(delta) {
    state.data.Barrier = clamp(toNumber(state.data.Barrier, 6) + delta * 2, 6, 20);
    persistState();
    renderAttributes();
  }

  function stepMarkState(store, key, delta) {
    const index = MARK_STATES.indexOf(store[key] || '');
    const next = MARK_STATES[(index + delta + 3) % 3];
    if (next) store[key] = next; else delete store[key];
  }

  function stepConflictMark(markKey, delta) {
    stepMarkState(state.sc, markKey, delta);
    persistState();
    renderConflictTracker();
  }

  function hitTrackFor(value) {
    return HIT_LETHAL_STATES.includes(value) ? HIT_LETHAL_STATES : HIT_NONLETHAL_STATES;
  }

  function stepHitBox(boxKey, delta, forceTrack) {
    const current = state.hp[boxKey] || '';
    const track = forceTrack || hitTrackFor(current);
    const index = track.indexOf(current);
    const from = index === -1 ? 0 : index;
    const next = track[(from + delta + track.length) % track.length];
    if (next) state.hp[boxKey] = next; else delete state.hp[boxKey];
    persistState();
    renderHitLocations();
  }

  function toggleItemRow(sectionKey, itemId) {
    const rowKey = sectionKey + ':' + itemId;
    if (state.openRows[rowKey]) delete state.openRows[rowKey]; else state.openRows[rowKey] = 1;
    persistState();
    renderItemSections();
  }

  function toggleAllRows(sectionKey) {
    const openAll = !state.sectionAllOpen[sectionKey];
    (state.items[sectionKey] || []).forEach((item) => {
      const rowKey = sectionKey + ':' + item.id;
      if (openAll) state.openRows[rowKey] = 1; else delete state.openRows[rowKey];
    });
    state.sectionAllOpen[sectionKey] = openAll;
    persistState();
    renderItemSections();
  }

  function adjustItemUse(sectionKey, itemId, delta) {
    state.items[sectionKey] = (state.items[sectionKey] || []).map((item) => {
      if (item.id !== itemId) return item;
      const extra = item.extra || {};
      const total = Math.max(0, toNumber(extra.qty, 0));
      return { ...item, extra: { ...extra, used: clamp(toNumber(extra.used, 0) + delta, 0, total) } };
    });
    persistState();
    renderItemSections();
    renderTotals();
  }

  function deleteItemEntry(sectionKey, itemId) {
    if (sectionKey === 'Equipment') {
      const list = state.items.Equipment || [];
      const attachedChildren = list.filter((item) => isAttachment(item) && (item.extra || {}).fittedId === itemId);
      if (attachedChildren.length) {
        const many = attachedChildren.length > 1;
        if (!window.confirm('This weapon has ' + attachedChildren.length + ' attachment' + (many ? 's' : '') + '. Delete ' + (many ? 'them' : 'it') + ' too?')) return;
        const idsToRemove = attachedChildren.map((item) => item.id).concat([itemId]);
        state.items.Equipment = list.filter((item) => idsToRemove.indexOf(item.id) < 0);
        persistState();
        renderItemSections();
        renderTotals();
        return;
      }
    }
    state.items[sectionKey] = (state.items[sectionKey] || []).filter((item) => item.id !== itemId);
    persistState();
    renderItemSections();
    renderTotals();
  }

  /* ==================== drag reorder ==================== */

  let draggedItemRef = null;

  document.addEventListener('dragstart', (event) => {
    const row = event.target.closest && event.target.closest('.row[draggable]');
    if (!row) return;
    draggedItemRef = { section: row.dataset.section, id: row.dataset.id };
    row.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try { event.dataTransfer.setData('text/plain', row.dataset.id); } catch (error) {}
    }
  });

  document.addEventListener('dragover', (event) => {
    const row = event.target.closest && event.target.closest('.row[draggable]');
    if (!row || !draggedItemRef || row.dataset.section !== draggedItemRef.section) return;
    event.preventDefault();
    row.classList.add('drag-over');
  });

  document.addEventListener('dragleave', (event) => {
    const row = event.target.closest && event.target.closest('.row[draggable]');
    if (row) row.classList.remove('drag-over');
  });

  document.addEventListener('dragend', () => {
    draggedItemRef = null;
    Array.prototype.forEach.call(document.querySelectorAll('.row.dragging,.row.drag-over'), (row) => row.classList.remove('dragging', 'drag-over'));
  });

  document.addEventListener('drop', (event) => {
    const row = event.target.closest && event.target.closest('.row[draggable]');
    const dragged = draggedItemRef;
    draggedItemRef = null;
    if (!row || !dragged) return;
    event.preventDefault();

    const sectionKey = row.dataset.section;
    const itemId = row.dataset.id;
    if (sectionKey !== dragged.section || itemId === dragged.id) { renderItemSections(); return; }

    const list = (state.items[sectionKey] || []).slice();
    const from = list.findIndex((item) => item.id === dragged.id);
    const target = list.filter((item) => item.id === itemId)[0];
    if (from < 0 || !target) { renderItemSections(); return; }

    let moved = list[from];
    if (sectionKey === 'Equipment' && isAttachment(moved)) {
      const parentId = isAttachment(target) ? (target.extra || {}).fittedId
        : ((((target.extra || {}).type) || 'weapon') === 'weapon' ? target.id : null);
      if (!parentId) { renderItemSections(); return; }
      moved = { ...moved, extra: { ...(moved.extra || {}), fittedId: parentId } };
    }

    list.splice(from, 1);
    const to = list.findIndex((item) => item.id === itemId);
    list.splice(to < 0 ? list.length : to, 0, moved);
    state.items[sectionKey] = list;

    persistState();
    renderItemSections();
  });

  /* ==================== import / export / portrait ==================== */

  function exportSheet() {
    const blob = new Blob([JSON.stringify({
      data: state.data, hp: state.hp, sc: state.sc, scOpen: state.scOpen, items: state.items, openRows: state.openRows, portrait: state.portrait,
    }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = String(state.data.AgentName || 'agent').replace(/[^\w\-]+/g, '-').toLowerCase() + '-sheet.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }

  function importSheet(file) {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        const parsed = JSON.parse(fileReader.result);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          data: parsed.data || {}, hp: parsed.hp || {}, sc: parsed.sc || {}, scOpen: parsed.scOpen !== false,
          items: parsed.items || {}, openRows: parsed.openRows || {}, portrait: parsed.portrait || '',
        }));
        window.location.reload();
      } catch (error) {
        window.alert('That file could not be read as a character sheet.');
      }
    };
    fileReader.readAsText(file);
  }

  /* ==================== portrait crop dialog ==================== */

  const CROP_VIEWPORT_SIZE = 280;
  const CROP_OUTPUT_SIZE = 480;

  function openPortraitCropDialog(file) {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const baseScale = CROP_VIEWPORT_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
        state.crop = { src: fileReader.result, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, zoom: 1, baseScale, offsetX: 0, offsetY: 0 };
        centerCropImage();
        renderCropDialog();
      };
      img.src = fileReader.result;
    };
    fileReader.readAsDataURL(file);
  }

  function currentCropScale() { return state.crop.baseScale * state.crop.zoom; }

  function centerCropImage() {
    const crop = state.crop;
    const scale = currentCropScale();
    crop.offsetX = (CROP_VIEWPORT_SIZE - crop.naturalWidth * scale) / 2;
    crop.offsetY = (CROP_VIEWPORT_SIZE - crop.naturalHeight * scale) / 2;
  }

  function clampCropOffset() {
    const crop = state.crop;
    const scale = currentCropScale();
    crop.offsetX = clamp(crop.offsetX, CROP_VIEWPORT_SIZE - crop.naturalWidth * scale, 0);
    crop.offsetY = clamp(crop.offsetY, CROP_VIEWPORT_SIZE - crop.naturalHeight * scale, 0);
  }

  function updateCropImage() {
    const crop = state.crop;
    if (!crop) return;
    clampCropOffset();
    const img = query('#cropImage');
    if (!img) return;
    const scale = currentCropScale();
    img.style.width = (crop.naturalWidth * scale) + 'px';
    img.style.height = (crop.naturalHeight * scale) + 'px';
    img.style.left = crop.offsetX + 'px';
    img.style.top = crop.offsetY + 'px';
  }

  function renderCropDialog() {
    const crop = state.crop;
    if (!crop) return;
    const scale = currentCropScale();
    const html = '<div class="panel-header"><div class="title">ADJUST PORTRAIT</div></div>'
      + '<div class="crop-view" id="cropViewport">'
      + '<img id="cropImage" src="' + crop.src + '" draggable="false" alt=""'
      + ' style="width:' + (crop.naturalWidth * scale) + 'px;height:' + (crop.naturalHeight * scale) + 'px;left:' + crop.offsetX + 'px;top:' + crop.offsetY + 'px">'
      + '</div>'
      + '<div class="col"><span class="label">ZOOM</span>'
      + '<input class="range" id="cropZoomRange" type="range" min="1" max="3" step="0.01" value="' + crop.zoom + '"></div>'
      + '<div class="dialog-footer"><button class="btn ghost" data-action="cropCancel">CANCEL</button>'
      + '<button class="btn primary" data-action="cropSave">USE PHOTO</button></div>';
    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
    bindCropDragHandlers();
  }

  function bindCropDragHandlers() {
    const viewport = query('#cropViewport');
    if (!viewport) return;
    let dragging = false;
    let startX = 0, startY = 0, startOffsetX = 0, startOffsetY = 0;

    viewport.addEventListener('pointerdown', (event) => {
      dragging = true;
      startX = event.clientX; startY = event.clientY;
      startOffsetX = state.crop.offsetX; startOffsetY = state.crop.offsetY;
      viewport.classList.add('dragging');
      try { viewport.setPointerCapture(event.pointerId); } catch (error) {}
    });
    viewport.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      state.crop.offsetX = startOffsetX + (event.clientX - startX);
      state.crop.offsetY = startOffsetY + (event.clientY - startY);
      updateCropImage();
    });
    const end = (event) => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('dragging');
      try { viewport.releasePointerCapture(event.pointerId); } catch (error) {}
    };
    viewport.addEventListener('pointerup', end);
    viewport.addEventListener('pointercancel', end);
  }

  function closeCropDialog() {
    state.crop = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  }

  function savePortraitCrop() {
    const crop = state.crop;
    if (!crop) return;
    const scale = currentCropScale();
    const cropX = -crop.offsetX / scale;
    const cropY = -crop.offsetY / scale;
    const cropSize = CROP_VIEWPORT_SIZE / scale;
    const canvas = document.createElement('canvas');
    canvas.width = CROP_OUTPUT_SIZE;
    canvas.height = CROP_OUTPUT_SIZE;
    canvas.getContext('2d').drawImage(query('#cropImage'), cropX, cropY, cropSize, cropSize, 0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);
    state.portrait = canvas.toDataURL('image/jpeg', 0.88);
    closeCropDialog();
    persistState();
    renderPortrait();
  }

  /* ==================== events ==================== */

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.matches('[data-field]')) {
      state.data[target.getAttribute('data-field')] = target.value;
      persistState();
      const fieldKey = target.getAttribute('data-field');
      if (fieldKey === 'SP2' || fieldKey === 'RP2') renderTotals();
      return;
    }
    if (target.id === 'dialogCost') { if (state.dialog) state.dialog.extra.cost = target.value; return; }
    if (target.matches('[data-dialog-field]') && state.dialog) { state.dialog.extra[target.getAttribute('data-dialog-field')] = target.value; return; }
    if (target.id === 'cropZoomRange' && state.crop) { state.crop.zoom = toNumber(target.value, 1); updateCropImage(); }
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'importFile' && event.target.files[0]) importSheet(event.target.files[0]);
    if (event.target.id === 'portraitFile' && event.target.files[0]) { openPortraitCropDialog(event.target.files[0]); event.target.value = ''; }
  });

  document.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.getAttribute('data-action');
      const sectionKey = actionEl.getAttribute('data-section');
      const itemId = actionEl.getAttribute('data-id');
      const delta = toNumber(actionEl.getAttribute('data-delta'), 1);
      switch (action) {
        case 'print': window.print(); return;
        case 'export': exportSheet(); return;
        case 'import': query('#importFile').click(); return;
        case 'reset':
          if (window.confirm('Clear this character sheet? Export first if you want to keep it.')) {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
          }
          return;
        case 'die': stepDie(actionEl.getAttribute('data-key'), delta); return;
        case 'barrier': stepBarrier(delta); return;
        case 'conflict': stepConflictMark(actionEl.getAttribute('data-key'), 1); return;
        case 'hp': stepHitBox(actionEl.getAttribute('data-key'), 1, HIT_LETHAL_STATES); return;
        case 'hpClear':
          if (window.confirm('Clear all hit point marks?')) {
            state.hp = {};
            persistState();
            renderHitLocations();
          }
          return;
        case 'hpHintToggle': {
          const hint = query('#hpHint');
          hint.hidden = !hint.hidden;
          actionEl.setAttribute('aria-expanded', String(!hint.hidden));
          return;
        }
        case 'conflictToggle': state.scOpen = !state.scOpen; persistState(); renderConflictTracker(); return;
        case 'toggleRow': toggleItemRow(sectionKey, itemId); return;
        case 'toggleAll': toggleAllRows(sectionKey); return;
        case 'quantity': adjustItemUse(sectionKey, itemId, delta); return;
        case 'add': openItemDialog(sectionKey, null); return;
        case 'edit': openItemDialog(sectionKey, (state.items[sectionKey] || []).filter((item) => item.id === itemId)[0]); return;
        case 'del': deleteItemEntry(sectionKey, itemId); return;
        case 'dlgType':
          collectDialogInputs();
          state.dialog.extra.type = actionEl.getAttribute('data-type');
          if (state.dialog.extra.type === 'attachment' && !state.dialog.extra.fittedId) {
            const weapon = weaponOptions()[0];
            if (weapon) state.dialog.extra.fittedId = weapon.value;
          }
          renderItemDialog();
          return;
        case 'dlgSingle':
          collectDialogInputs();
          state.dialog.extra.single = !isSingleUse(state.dialog.extra);
          renderItemDialog();
          return;
        case 'dlgStep': {
          collectDialogInputs();
          const fieldKey = actionEl.getAttribute('data-key');
          const lo = toNumber(actionEl.getAttribute('data-min'), 1);
          let hi = toNumber(actionEl.getAttribute('data-max'), 6);
          if (fieldKey === 'rank' && state.dialog.section === 'SpecialtySkills') hi = Math.max(1, toNumber(state.dialog.extra.maxRanks, 1));
          state.dialog.extra[fieldKey] = clamp(toNumber(state.dialog.extra[fieldKey], lo) + delta, lo, hi);
          if (fieldKey === 'maxRanks') state.dialog.extra.rank = clamp(toNumber(state.dialog.extra.rank, 1), 1, state.dialog.extra.maxRanks);
          renderItemDialog();
          return;
        }
        case 'dlgCancel': closeItemDialog(); return;
        case 'dlgSave': saveItemDialog(); return;
        case 'cropCancel': closeCropDialog(); return;
        case 'cropSave': savePortraitCrop(); return;
      }
    }
    if (event.target.closest('#portrait')) { query('#portraitFile').click(); return; }
  });

  document.addEventListener('contextmenu', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) {
      if (event.target.closest('#portrait') && state.portrait) {
        event.preventDefault();
        if (window.confirm('Remove the portrait?')) { state.portrait = ''; persistState(); renderPortrait(); }
      }
      return;
    }
    const action = actionEl.getAttribute('data-action');
    if (action === 'conflict') { event.preventDefault(); stepConflictMark(actionEl.getAttribute('data-key'), -1); }
    if (action === 'hp') { event.preventDefault(); stepHitBox(actionEl.getAttribute('data-key'), -1); }
  });

  document.addEventListener('mousedown', (event) => {
    if (event.button === 1 && event.target.closest('[data-action="hp"]')) event.preventDefault();
  });

  document.addEventListener('auxclick', (event) => {
    if (event.button !== 1) return;
    const actionEl = event.target.closest('[data-action="hp"]');
    if (!actionEl) return;
    event.preventDefault();
    stepHitBox(actionEl.getAttribute('data-key'), 1, HIT_NONLETHAL_STATES);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.dialog) { closeItemDialog(); return; }
    if (event.key === 'Escape' && state.crop) { closeCropDialog(); return; }
    const actionEl = event.target.closest && event.target.closest('[data-action="conflict"],[data-action="hp"]');
    if (actionEl && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); actionEl.click(); }
  });

  /* ==================== print ==================== */

  let printHeights = null;
  window.addEventListener('beforeprint', () => {
    printHeights = [];
    Array.prototype.forEach.call(document.querySelectorAll('textarea.field'), (el) => {
      printHeights.push([el, el.style.height]);
      const computedStyle = getComputedStyle(el);
      const border = parseFloat(computedStyle.borderTopWidth) + parseFloat(computedStyle.borderBottomWidth);
      el.style.height = (el.scrollHeight + border) + 'px';
    });
  });
  window.addEventListener('afterprint', () => {
    if (!printHeights) return;
    printHeights.forEach(([el, height]) => { el.style.height = height; });
    printHeights = null;
  });

  /* ==================== boot ==================== */

  state = loadState();
  TEXT_FIELD_KEYS.forEach((fieldKey) => {
    const el = query('[data-field="' + fieldKey + '"]');
    if (el) el.value = state.data[fieldKey] || '';
  });
  renderPortrait();
  renderAttributes();
  renderConflictTracker();
  renderHitLocations();
  renderItemSections();
  renderTotals();
  persistState();
})();

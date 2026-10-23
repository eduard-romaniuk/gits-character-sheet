(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;
  const toNumber = Sheet.toNumber;
  const clamp = Sheet.clamp;
  const isAttachment = Sheet.isAttachment;

  // Print-only document: a single-column, fully expanded rendering of the active
  // character. Nothing here is interactive — every description, rank text and
  // loadout is spelled out, unlike the collapsible rows of the on-screen sheet.

  const EMPTY = '—';

  function text(value) {
    const s = String(value == null ? '' : value).trim();
    return s ? escapeHtml(s) : EMPTY;
  }

  function sectionTitle(label) {
    return '<h2 class="p-title">' + label + '</h2>';
  }

  function field(label, value) {
    return '<div class="p-field"><div class="p-label">' + label + '</div><div class="p-value">' + text(value) + '</div></div>';
  }

  function prose(value) {
    const s = String(value || '').trim();
    return '<div class="p-prose' + (s ? '' : ' empty') + '">' + (s ? escapeHtml(s) : EMPTY) + '</div>';
  }

  // Slash marks drawn as inline SVG so they print regardless of the browser's
  // "background graphics" setting (the screen sheet draws them as CSS gradients).
  function markSvg(state, round) {
    const one = state === 'temp' || state === 'perm' || state === 'x';
    const both = state === 'perm' || state === 'x';
    const shape = round ? '<circle cx="8" cy="8" r="7.25"/>' : '<rect x=".75" y=".75" width="14.5" height="14.5" rx="1"/>';
    return '<svg class="p-mark' + (state === 'x' ? ' fixed' : '') + '" viewBox="0 0 16 16" aria-hidden="true">' + shape
      + (one ? '<line x1="3" y1="13" x2="13" y2="3"/>' : '')
      + (both ? '<line x1="3" y1="3" x2="13" y2="13"/>' : '')
      + '</svg>';
  }

  function itemBlock(name, metaFields, bodyHtml, extraClass) {
    return '<div class="p-item' + (extraClass ? ' ' + extraClass : '') + '">'
      + '<div class="p-item-head"><div class="p-item-name">' + text(name) + '</div>'
      + (metaFields.length ? '<div class="p-item-meta">' + metaFields.map(([label, value]) => '<span><b>' + label + '</b> ' + text(value) + '</span>').join('') + '</div>' : '')
      + '</div>'
      + (bodyHtml || '')
      + '</div>';
  }

  function itemNotes(notes) {
    const s = String(notes || '').trim();
    return s ? '<div class="p-item-body">' + escapeHtml(s) + '</div>' : '';
  }

  function emptySection() {
    return '<div class="p-empty">NONE RECORDED</div>';
  }

  /* ==================== sections ==================== */

  // Mirrors the sheet's identity panel: portrait on the left; names, then back story, on the right.
  function renderHeader(data, portrait) {
    const showAgentId = !!(Sheet.settings && Sheet.settings.showAgentId);
    return '<header class="p-header">'
      + '<div class="p-kicker">SECTION 9 &nbsp;//&nbsp; AGENT DOSSIER</div>'
      + '<div class="p-ident">'
      + '<div class="p-portrait">' + (portrait ? '<img alt="" src="' + portrait + '">' : '<span>AGENT<br>PORTRAIT</span>') + '</div>'
      + '<div class="p-ident-fields">'
      + '<div class="p-ident-names' + (showAgentId ? ' with-id' : '') + '">'
      + field('AGENT NAME', data.AgentName)
      + (showAgentId ? field('AGENT ID', data.AgentId) : '')
      + field('PLAYER NAME', data.PlayerName)
      + '</div>'
      + '<div class="p-field"><div class="p-label">AGENT BACK STORY</div>' + prose(data.BackStory) + '</div>'
      + '</div></div>'
      + '</header>';
  }

  function renderAttributes(data) {
    const cells = [];
    Sheet.ATTRIBUTE_GROUPS.forEach(([, list]) => list.forEach(([key, label]) => cells.push([label, String(data[key] || 'd6').toUpperCase()])));
    cells.push(['HACKING', String(data.Hacking || 'd6').toUpperCase()]);
    cells.push(['BARRIER', toNumber(data.Barrier, 6)]);
    const pools = [
      ['GHOST-WHISPERS', text(data.GW1) + ' / ' + text(data.GW2)],
      ['SKILL POINTS', Sheet.skillPointsTotal() + ' / ' + text(data.SP2)],
      ['REQUISITION MAX', text(data.RP2)],
    ];
    return '<section class="p-section">' + sectionTitle('ATTRIBUTES')
      + '<div class="p-stats">' + cells.map(([label, value]) => '<div class="p-stat"><div class="p-label">' + label + '</div><div class="p-stat-value">' + escapeHtml(value) + '</div></div>').join('') + '</div>'
      + '<div class="p-stats p-pools">' + pools.map(([label, value]) => '<div class="p-stat"><div class="p-label">' + label + '</div><div class="p-stat-value">' + value + '</div></div>').join('') + '</div>'
      + '</section>';
  }

  function renderConflict(data, sc) {
    // One 3-column grid: each aspect heads its own column of marks, VS heads the die labels.
    let grid = '<div class="p-aspect">' + text(data.Aspect1) + '</div><div class="p-vs">VS</div><div class="p-aspect">' + text(data.Aspect2) + '</div>';
    Sheet.CONFLICT_ROWS.forEach((size) => {
      grid += markSvg(sc['L' + size] || '') + '<div class="p-conflict-die">D' + size + '</div>' + markSvg(sc['R' + size] || '');
    });
    grid += markSvg('x') + '<div class="p-conflict-die">D4</div>' + markSvg('x');
    return '<section class="p-section">' + sectionTitle('SYNTHESIS CONFLICT')
      + '<div class="p-conflict">' + grid + '</div>'
      + prose(data.SC_Notes)
      + '</section>';
  }

  // Hit points always print blank, whatever is marked on screen: players track
  // damage by hand during an offline session.
  function renderHitLocations(data) {
    const rows = Sheet.HIT_LOCATIONS.map(([label, range, key, count]) => {
      let boxes = '';
      for (let index = 0; index < count; index++) boxes += markSvg('', true);
      return '<tr><td class="p-range">' + range + '</td><td>' + label + '</td>'
        + '<td class="p-boxes">' + boxes + '</td><td class="p-num">' + text(data[key + '_Armor']) + '</td></tr>';
    }).join('');
    return '<section class="p-section">' + sectionTitle('HIT POINTS &amp; ARMOR')
      + '<table class="p-table"><thead><tr><th>D20</th><th>LOCATION</th><th>HIT POINTS</th><th class="p-num">ARMOR</th></tr></thead>'
      + '<tbody>' + rows + '</tbody></table>'
      + '</section>';
  }

  function itemSection(sectionKey, label, renderItem) {
    const items = Sheet.resolveSectionItems(sectionKey);
    return '<section class="p-section">' + sectionTitle(label)
      + (items.length ? items.map(renderItem).join('') : emptySection())
      + '</section>';
  }

  function renderSetback(item) {
    return itemBlock(item.name, [], itemNotes(item.notes));
  }

  function renderCybernetic(item) {
    return itemBlock(item.name, Sheet.ITEM_FIELD_SCHEMA.Cybernetics.map(([key, label]) => [label, item.extra[key]]), itemNotes(item.notes));
  }

  function renderSkill(item) {
    const rank = clamp(toNumber(item.extra.rank, 1), 1, 6);
    return itemBlock(item.name, [['RANK', rank + ' (' + Sheet.rankToDieLabel(rank) + ')']], itemNotes(item.notes));
  }

  function renderSpecialtySkill(item) {
    const extra = item.extra;
    const maxRank = Math.max(1, toNumber(extra.maxRanks, 1));
    const currentRank = clamp(toNumber(extra.rank, 1), 1, maxRank);
    // A single-rank skill has nothing to progress through — its notes are the whole description.
    let ranks = '';
    if (maxRank > 1) {
      for (let rank = 1; rank <= maxRank; rank++) {
        ranks += '<div class="p-rank">'
          + '<div class="p-rank-key"><span class="p-rank-box' + (rank <= currentRank ? ' filled' : '') + '"></span>RANK ' + rank + '</div>'
          + '<div class="p-rank-text">' + text(extra['r' + rank]) + '</div></div>';
      }
      ranks = '<div class="p-ranks">' + ranks + '</div>';
    }
    return itemBlock(item.name, [['RANK', currentRank + ' / ' + maxRank]], itemNotes(item.notes) + ranks);
  }

  function renderEquipmentItem(item, allEquipment) {
    const extra = item.extra;
    const type = extra.type || 'weapon';
    // EQUIPMENT_TYPES labels are plural group headings (WEAPONS, THROWABLES…); one item reads singular.
    const typeLabel = ((Sheet.EQUIPMENT_TYPES.filter((t) => t[0] === type)[0]) || ['', 'WEAPONS'])[1].replace(/S$/, '');
    const totalQty = toNumber(extra.qty, 0) + toNumber(extra.freeQty, 0);
    const meta = [['TYPE', typeLabel]];
    (Sheet.EQUIPMENT_FIELDS[type] || []).forEach(([fieldKey, label]) => {
      if (fieldKey === 'skill') return;
      if (fieldKey === 'qty') {
        if (!Sheet.isSingleUse(extra)) return;
        meta.push([label, Math.max(0, totalQty - toNumber(extra.used, 0)) + ' / ' + totalQty]);
        return;
      }
      if (fieldKey === 'fittedId') {
        const weapon = allEquipment.find((other) => other.instanceId === extra.fittedId);
        meta.push([label, weapon ? weapon.name : '']);
        return;
      }
      if (fieldKey === 'cost') {
        meta.push([label, toNumber(extra.cost, 0)]);
        return;
      }
      meta.push([label, extra[fieldKey]]);
    });
    const skill = extra.skill ? '<div class="p-item-line"><b>SKILL</b> ' + escapeHtml(extra.skill) + '</div>' : '';
    return itemBlock(item.name, meta, skill + itemNotes(item.notes), isAttachment(item) ? 'p-attachment' : '');
  }

  function renderEquipment(data) {
    const allEquipment = Sheet.resolveSectionItems('Equipment');
    const loadouts = Sheet.state.loadouts || [];
    const groups = loadouts.map((loadout) => ({ loadout: loadout, items: allEquipment.filter((item) => item.extra.loadoutId === loadout.id) }));
    const unassigned = allEquipment.filter((item) => !loadouts.some((loadout) => loadout.id === item.extra.loadoutId));
    if (unassigned.length) groups.push({ loadout: null, items: unassigned });

    const body = groups.map(({ loadout, items }) => {
      const spent = loadout ? Sheet.requisitionPointsTotalFor(loadout.id) : null;
      return '<div class="p-loadout">'
        + '<div class="p-loadout-head"><div class="p-loadout-name">LOADOUT: ' + (loadout ? text(loadout.name) : 'UNASSIGNED') + '</div>'
        + (spent != null ? '<div class="p-loadout-rp">RP SPENT ' + spent + ' / ' + text(data.RP2) + '</div>' : '')
        + '</div>'
        + (items.length ? Sheet.orderItemsForDisplay('Equipment', items).map((item) => renderEquipmentItem(item, allEquipment)).join('') : emptySection())
        + '</div>';
    }).join('');

    return '<section class="p-section">' + sectionTitle('WEAPONS &amp; EQUIPMENT') + body + '</section>';
  }

  /* ==================== document ==================== */

  Sheet.renderPrintView = function renderPrintView() {
    const el = query('#printView');
    if (!el || !Sheet.state) return;
    const data = Sheet.state.data || {};
    el.innerHTML = renderHeader(data, Sheet.state.portrait)
      + renderAttributes(data)
      + '<div class="p-pair">' + renderConflict(data, Sheet.state.sc || {}) + renderHitLocations(data) + '</div>'
      + itemSection('Setbacks', 'SETBACKS', renderSetback)
      + itemSection('Cybernetics', 'CYBERNETICS', renderCybernetic)
      + itemSection('Skills', 'STANDARD SKILLS', renderSkill)
      + itemSection('SpecialtySkills', 'SPECIALTY SKILLS', renderSpecialtySkill)
      + renderEquipment(data)
      + (String(data.Notes || '').trim() ? '<section class="p-section">' + sectionTitle('NOTES') + prose(data.Notes) + '</section>' : '');
  };

  function characterViewActive() {
    const characterEl = query('#view-character');
    return !!(Sheet.state && characterEl && !characterEl.hidden);
  }

  // Browsers use the document title as the suggested PDF filename.
  let savedTitle = null;
  function restoreTitle() {
    if (savedTitle == null) return;
    document.title = savedTitle;
    savedTitle = null;
  }

  // The print stylesheet only swaps the app for #printView while body has
  // .print-character, so printing the roster or Codex still prints those views.
  function preparePrint() {
    const active = characterViewActive();
    document.body.classList.toggle('print-character', active);
    if (active) Sheet.renderPrintView();
    return active;
  }

  Sheet.printCharacter = function printCharacter() {
    if (!preparePrint()) return;
    savedTitle = document.title;
    document.title = Sheet.slugName(Sheet.state.data.AgentName) + '-sheet';
    window.print();
  };

  // Covers Ctrl+P / browser menu printing, which bypasses the PDF button.
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-character');
    restoreTitle();
  });
})(window.Sheet = window.Sheet || {});

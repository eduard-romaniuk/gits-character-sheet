(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;
  const toNumber = Sheet.toNumber;
  const clamp = Sheet.clamp;
  const isAttachment = Sheet.isAttachment;

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

  function rowSummaryText(sectionKey, extra) {
    if (sectionKey === 'Equipment') {
      const type = extra.type || 'weapon';
      const typeLabel = ((Sheet.EQUIPMENT_TYPES.filter((t) => t[0] === type)[0]) || ['', 'WEAPON'])[1];
      const parts = [];
      (Sheet.EQUIPMENT_FIELDS[type] || []).forEach(([fieldKey]) => {
        if (fieldKey === 'skill' || fieldKey === 'qty' || fieldKey === 'fittedId' || fieldKey === 'cost') return;
        const value = extra[fieldKey];
        if (!value) return;
        const prefix = Sheet.META_LABEL_PREFIX[fieldKey];
        parts.push(prefix ? prefix + ' ' + value : String(value));
      });
      if (type !== 'attachment') parts.push(typeLabel);
      parts.push(Sheet.META_LABEL_PREFIX.cost + ' ' + toNumber(extra.cost, 0));
      return parts.join('  ·  ');
    }
    if (sectionKey === 'SpecialtySkills') {
      const maxRank = Math.max(1, toNumber(extra.maxRanks, 1));
      const currentRank = clamp(toNumber(extra.rank, 1), 1, maxRank);
      return 'RANK ' + currentRank + ' / ' + maxRank;
    }
    return (Sheet.ITEM_FIELD_SCHEMA[sectionKey] || []).map(([fieldKey, , kind]) => {
      const raw = extra[fieldKey];
      if (kind === 'rank') return Sheet.rankToDieLabel(raw || 1);
      return raw;
    }).filter(Boolean).join('  ·  ');
  }

  function renderLoadoutBar() {
    const loadouts = Sheet.state.loadouts || [];
    const chips = loadouts.map((loadout) => '<button class="chip' + (loadout.id === Sheet.state.activeLoadoutId ? ' selected' : '') + '"'
      + ' data-action="loadoutSelect" data-loadout-id="' + loadout.id + '">' + escapeHtml(loadout.name) + '</button>').join('');
    const activeLoadout = loadouts.filter((loadout) => loadout.id === Sheet.state.activeLoadoutId)[0];
    return '<div class="loadout-bar">'
      + '<div class="chips">' + chips
      + '<button class="chip" data-action="loadoutAdd" aria-label="new loadout">+ NEW</button></div>'
      + (activeLoadout ? '<div class="loadout-manage">'
          + '<button class="icon" data-action="loadoutEdit" data-loadout-id="' + activeLoadout.id + '">RENAME</button>'
          + (loadouts.length > 1 ? '<button class="icon delete" data-action="loadoutDelete" data-loadout-id="' + activeLoadout.id + '" aria-label="delete loadout">×</button>' : '')
          + '</div>' : '') + '</div>';
  }

  function renderSectionMarkup(sectionKey, label) {
    const isEquipmentSection = sectionKey === 'Equipment';
    const list = isEquipmentSection
      ? (Sheet.state.items.Equipment || []).filter((item) => item.loadoutId === Sheet.state.activeLoadoutId)
      : (Sheet.state.items[sectionKey] || []);
    let rows = '';
    orderItemsForDisplay(sectionKey, list).forEach((item) => {
      const extra = item.extra || {};
      const open = !!Sheet.state.openRows[sectionKey + ':' + item.id];
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
      + '<button class="btn small" data-action="toggleAll" data-section="' + sectionKey + '">'
      + (Sheet.state.sectionAllOpen[sectionKey] ? 'HIDE ALL' : 'SHOW ALL') + '</button></div>'
      + (isEquipmentSection ? renderLoadoutBar() : '')
      + '<div class="rows">' + rows + '</div>'
      + '<button class="btn dashed" data-action="add" data-section="' + sectionKey + '">+ ADD</button></div>';
  }

  Sheet.renderItemSections = function renderItemSections() {
    query('#sectionTop').innerHTML = renderSectionMarkup.apply(null, Sheet.ITEM_SECTIONS[0]) + renderSectionMarkup.apply(null, Sheet.ITEM_SECTIONS[1]);
    query('#sectionSkills').innerHTML = renderSectionMarkup.apply(null, Sheet.ITEM_SECTIONS[2]) + renderSectionMarkup.apply(null, Sheet.ITEM_SECTIONS[3]);
    query('#sectionGear').innerHTML = renderSectionMarkup.apply(null, Sheet.ITEM_SECTIONS[4]);
  };
})(window.Sheet = window.Sheet || {});

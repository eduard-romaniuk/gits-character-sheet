(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;

  function groupLabel(groupId) {
    if (groupId === 'ALL') return 'ALL';
    if (groupId === 'UNGROUPED') return Sheet.DEFAULT_GROUP_NAME;
    const group = (Sheet.groups || []).find((g) => g.id === groupId);
    return group ? group.name : Sheet.DEFAULT_GROUP_NAME;
  }

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

  function filteredItems() {
    const section = Sheet.ui.librarySection;
    const groupId = Sheet.ui.libraryGroupId;
    const search = Sheet.ui.librarySearch.trim().toLowerCase();
    const equipType = Sheet.ui.libraryEquipmentType;
    return (Sheet.library[section] || []).filter((item) => {
      if (section === 'Equipment' && (item.type || 'weapon') !== equipType) return false;
      if (groupId === 'UNGROUPED' && item.groupId) return false;
      if (groupId !== 'ALL' && groupId !== 'UNGROUPED' && item.groupId !== groupId) return false;
      if (search && item.name.toLowerCase().indexOf(search) < 0) return false;
      return true;
    });
  }

  function buildRowsHtml(section) {
    const items = filteredItems();
    const rows = items.map((item) => '<div class="row"><button class="row-name" data-action="libraryEdit" data-section="' + section + '" data-id="' + item.id + '">' + escapeHtml(item.name) + '</button>'
      + '<div class="spacer"></div>'
      + '<div class="meta">' + escapeHtml(summaryFor(section, item)) + '</div>'
      + '<button class="icon" data-action="libraryEdit" data-section="' + section + '" data-id="' + item.id + '" aria-label="Edit" title="Edit">' + Sheet.ICONS.edit + '</button>'
      + '<button class="icon delete" data-action="libraryDelete" data-section="' + section + '" data-id="' + item.id + '" aria-label="Delete" title="Delete">' + Sheet.ICONS.delete + '</button>'
      + '</div>').join('');
    return rows || '<div class="empty">NOTHING IN THIS GROUP YET</div>';
  }

  Sheet.renderLibraryView = function renderLibraryView() {
    const section = Sheet.ui.librarySection;
    const groupId = Sheet.ui.libraryGroupId;
    const groupIds = ['ALL', 'UNGROUPED'].concat((Sheet.groups || []).map((g) => g.id));

    const groupChips = groupIds.map((id) => '<button class="chip' + (groupId === id ? ' selected' : '') + '" data-action="libraryGroup" data-group-id="' + id + '">' + escapeHtml(groupLabel(id)) + '</button>').join('')
      + '<button class="chip" data-action="groupAdd">+ NEW GROUP</button>';
    const activeGroup = (Sheet.groups || []).find((g) => g.id === groupId);
    const groupManage = activeGroup ? '<div class="loadout-manage">'
      + '<button class="icon" data-action="groupEdit" data-group-id="' + activeGroup.id + '" aria-label="Rename group" title="Rename">' + Sheet.ICONS.edit + '</button>'
      + '<button class="icon delete" data-action="groupDelete" data-group-id="' + activeGroup.id + '" aria-label="Delete group" title="Delete">' + Sheet.ICONS.delete + '</button>'
      + '</div>' : '';

    // Weapons & Equipment is split into 5 top-level type tabs here (Codex-only — the
    // character sheet's own Equipment section and the "ADD FROM CODEX" picker keep
    // browsing all types in one mixed list, unchanged).
    const equipType = Sheet.ui.libraryEquipmentType;
    const sectionTabs = Sheet.ITEM_SECTIONS.filter(([key]) => key !== 'Equipment')
      .map(([key, label]) => '<button class="chip' + (section === key ? ' selected' : '') + '" data-action="librarySection" data-section="' + key + '">' + label + '</button>').join('')
      + Sheet.EQUIPMENT_TYPES.map(([type, label]) => '<button class="chip' + (section === 'Equipment' && equipType === type ? ' selected' : '') + '" data-action="libraryEquipmentType" data-equipment-type="' + type + '">' + label + '</button>').join('');

    query('#view-library').innerHTML = '<div class="top">'
      + '<h1>SECTION 9 &nbsp;//&nbsp; CODEX</h1>'
      + '<div class="tools"><button class="btn ghost" data-action="backToRoster">← ROSTER</button></div></div>'
      + '<div class="panel" style="display:flex;flex-direction:column;gap:12px">'
      + '<div class="loadout-bar"><div class="chips">' + groupChips + '</div>' + groupManage + '</div>'
      + '<div class="chips">' + sectionTabs + '</div>'
      + '<input class="field" id="librarySearch" placeholder="Search…" value="' + escapeHtml(Sheet.ui.librarySearch) + '">'
      + '<div class="rows" id="libraryRows">' + buildRowsHtml(section) + '</div>'
      + '<button class="btn dashed" data-action="libraryAdd" data-section="' + section + '">+ NEW ITEM</button>'
      + '</div>';
  };

  // Only the row list is patched on keystroke so the search input never loses focus/cursor position.
  Sheet.setLibrarySearch = function setLibrarySearch(value) {
    Sheet.ui.librarySearch = value;
    const rowsEl = query('#libraryRows');
    if (rowsEl) rowsEl.innerHTML = buildRowsHtml(Sheet.ui.librarySection);
  };
})(window.Sheet = window.Sheet || {});

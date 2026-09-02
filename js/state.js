(function (Sheet) {
  'use strict';

  const STORAGE_KEY = Sheet.STORAGE_KEY;
  const ITEM_SECTIONS = Sheet.ITEM_SECTIONS;
  const toNumber = Sheet.toNumber;
  const clamp = Sheet.clamp;

  Sheet.state = null;

  Sheet.loadState = function loadState() {
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

    let loadouts = Array.isArray(saved.loadouts) ? saved.loadouts.filter((loadout) => loadout && loadout.id) : [];
    if (!loadouts.length) loadouts = [{ id: 'default', name: 'DEFAULT' }];
    let activeLoadoutId = saved.activeLoadoutId;
    if (!loadouts.some((loadout) => loadout.id === activeLoadoutId)) activeLoadoutId = loadouts[0].id;
    items.Equipment = items.Equipment.map((item) => (item.loadoutId ? item : { ...item, loadoutId: loadouts[0].id }));

    return {
      data: data,
      hp: saved.hp || {},
      sc: saved.sc || {},
      scOpen: saved.scOpen !== false,
      items: items,
      loadouts: loadouts,
      activeLoadoutId: activeLoadoutId,
      openRows: saved.openRows || {},
      sectionAllOpen: {},
      portrait: saved.portrait || '',
      dialog: null,
      loadoutDialog: null,
      crop: null,
    };
  };

  let persistTimer;
  Sheet.persistState = function persistState() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          data: Sheet.state.data, hp: Sheet.state.hp, sc: Sheet.state.sc, scOpen: Sheet.state.scOpen,
          items: Sheet.state.items, loadouts: Sheet.state.loadouts, activeLoadoutId: Sheet.state.activeLoadoutId,
          openRows: Sheet.state.openRows, portrait: Sheet.state.portrait,
        }));
      } catch (error) {}
    }, 250);
  };

  /* ==================== derived ==================== */

  Sheet.isAttachment = (item) => (item.extra || {}).type === 'attachment';
  Sheet.isSingleUse = (extra) => { const e = extra || {}; return e.single === undefined ? (e.qty !== undefined && e.qty !== '') : !!e.single; };
  Sheet.rankToDieLabel = (rank) => Sheet.RANK_DIE_LABELS[clamp(toNumber(rank, 1), 1, 6) - 1];
  Sheet.generateId = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  Sheet.weaponOptions = () => (Sheet.state.items.Equipment || [])
    .filter((item) => item.loadoutId === Sheet.state.activeLoadoutId && ((item.extra || {}).type || 'weapon') === 'weapon')
    .map((item) => ({ value: item.id, label: item.name }));

  Sheet.skillPointsTotal = () => (Sheet.state.items.Skills || []).reduce((sum, item) => sum + toNumber((item.extra || {}).rank, 0), 0)
    + (Sheet.state.items.SpecialtySkills || []).reduce((sum, item) => sum + toNumber((item.extra || {}).rank, 0), 0);

  Sheet.requisitionPointsTotal = () => (Sheet.state.items.Equipment || [])
    .filter((item) => item.loadoutId === Sheet.state.activeLoadoutId)
    .reduce((sum, item) => {
      const extra = item.extra || {};
      const units = Sheet.isSingleUse(extra) ? Math.max(1, toNumber(extra.qty, 1)) : 1;
      return sum + toNumber(extra.cost, 0) * units;
    }, 0);
})(window.Sheet = window.Sheet || {});

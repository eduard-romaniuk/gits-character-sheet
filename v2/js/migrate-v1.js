(function (Sheet) {
  'use strict';

  Sheet.detectV1Data = function detectV1Data() {
    try {
      const raw = localStorage.getItem(Sheet.V1_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed && (parsed.data || parsed.items));
    } catch (error) { return false; }
  };

  // v1 has no notion of a shared library, so every imported item is split into a new
  // library definition (left ungrouped, i.e. in the "Core Rulebook" bucket — see
  // Sheet.DEFAULT_GROUP_NAME) plus a linked character instance — nothing lands on the
  // character as a standalone item.

  // One-time v1 -> v2 import.
  Sheet.importV1 = function importV1() {
    let v1 = null;
    try { v1 = JSON.parse(localStorage.getItem(Sheet.V1_STORAGE_KEY)); } catch (error) { v1 = null; }
    if (!v1) return null;

    const newId = Sheet.generateId();
    const blob = Sheet.defaultCharacterBlob(newId);
    blob.data = { ...blob.data, ...(v1.data || {}) };
    blob.hp = v1.hp || {};
    blob.sc = v1.sc || {};
    blob.scOpen = v1.scOpen !== false;
    blob.openRows = {};
    blob.portrait = v1.portrait || '';

    let loadouts = Array.isArray(v1.loadouts) ? v1.loadouts.filter((l) => l && l.id) : [];
    if (!loadouts.length) loadouts = [{ id: Sheet.generateId(), name: 'DEFAULT' }];
    const loadoutIdMap = {};
    blob.loadouts = loadouts.map((loadout) => {
      const newLoadoutId = Sheet.generateId();
      loadoutIdMap[loadout.id] = newLoadoutId;
      return { id: newLoadoutId, name: loadout.name };
    });
    blob.activeLoadoutId = loadoutIdMap[v1.activeLoadoutId] || blob.loadouts[0].id;

    const items = v1.items || {};

    Sheet.ITEM_SECTIONS.forEach(([sectionKey]) => {
      const split = Sheet.LIBRARY_FIELD_SPLIT[sectionKey];
      const list = Array.isArray(items[sectionKey]) ? items[sectionKey] : [];
      const idMap = {};
      list.forEach((item) => { idMap[item.id] = Sheet.generateId(); });

      blob.items[sectionKey] = list.map((item) => {
        const extra = { ...(item.extra || {}) };
        if (sectionKey === 'Equipment') {
          extra.loadoutId = loadoutIdMap[item.loadoutId] || blob.activeLoadoutId;
          if (extra.fittedId) extra.fittedId = idMap[extra.fittedId] || extra.fittedId;
        }

        const libItem = { id: Sheet.generateId(), groupId: null, name: item.name || '', notes: item.notes || '' };
        split.def.forEach((field) => { if (field !== 'name' && field !== 'notes') libItem[field] = extra[field]; });
        Sheet.library[sectionKey] = (Sheet.library[sectionKey] || []).concat([libItem]);

        const overlay = {};
        split.overlay.forEach((field) => { overlay[field] = extra[field]; });

        return { instanceId: idMap[item.id], libraryId: libItem.id, overlay: overlay };
      });
    });

    Sheet.persistLibrary();

    try { localStorage.setItem(Sheet.characterKey(newId), JSON.stringify(blob)); } catch (error) {}
    Sheet.touchImportedCharacter(blob);
    return newId;
  };
})(window.Sheet = window.Sheet || {});

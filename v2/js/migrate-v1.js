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

  // Every v2 character blob carries a top-level id from creation onward; v1's own
  // file export never writes one. That plus the same data/items check detectV1Data
  // uses is enough to tell a v1 export apart from a v2 one in the shared file picker.
  Sheet.looksLikeV1Export = function looksLikeV1Export(parsed) {
    return !!(parsed && typeof parsed === 'object' && !parsed.id && (parsed.data || parsed.items));
  };

  // v1 has no notion of a shared library, so every imported item is split into a new
  // library definition (left ungrouped, i.e. in the "Core Rulebook" bucket — see
  // Sheet.DEFAULT_GROUP_NAME) plus a linked character instance — nothing lands on the
  // character as a standalone item.

  // Comparison key for "is this the same item" — every def field except name (name is
  // the dedup match key itself). Missing fields are normalized to '' so this matches
  // consistently regardless of whether a field was ever set (undefined) or cleared ('').
  function bodyFingerprint(sectionKey, candidate) {
    const split = Sheet.LIBRARY_FIELD_SPLIT[sectionKey];
    const body = {};
    split.def.forEach((field) => { if (field !== 'name') body[field] = candidate[field] == null ? '' : candidate[field]; });
    return JSON.stringify(body);
  }

  // Dedup by name (trimmed, exact match — no case-folding): reuse an existing library
  // item's id when the name and every other def field match exactly; on a same-name
  // collision with different field values, keep both by renaming the new one with a
  // source-tagged suffix (falling back to a counter if even that's taken).
  function findOrCreateLibraryItem(sectionKey, candidate, sourceLabel) {
    const list = Sheet.library[sectionKey] || [];
    const name = (candidate.name || '').trim();
    const sameName = list.filter((existing) => (existing.name || '').trim() === name);
    const exact = sameName.find((existing) => bodyFingerprint(sectionKey, existing) === bodyFingerprint(sectionKey, candidate));
    if (exact) return exact.id;

    if (sameName.length) {
      let suffixed = name + ' (from ' + sourceLabel + ')';
      let n = 2;
      while (list.some((existing) => (existing.name || '').trim() === suffixed)) {
        suffixed = name + ' (from ' + sourceLabel + ') (' + n + ')';
        n += 1;
      }
      candidate.name = suffixed;
    }

    Sheet.library[sectionKey] = list.concat([candidate]);
    return candidate.id;
  }

  // v1 -> v2 import from an already-parsed v1 blob (localStorage or an uploaded file).
  Sheet.importV1FromData = function importV1FromData(v1) {
    if (!v1) return null;

    const sourceLabel = ((v1.data && v1.data.AgentName) || '').trim() || 'Agent';

    const newId = Sheet.generateId();
    const blob = Sheet.defaultCharacterBlob(newId);
    blob.data = { ...blob.data, ...(v1.data || {}) };
    blob.hp = v1.hp || {};
    blob.sc = v1.sc || {};
    blob.scOpen = v1.scOpen !== false;
    blob.openRows = {};
    blob.portrait = v1.portrait || '';

    // v1's downloaded file export omits loadouts/activeLoadoutId (only present in v1's
    // live localStorage save), so file-based imports fall back to one DEFAULT loadout.
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
        const libraryId = findOrCreateLibraryItem(sectionKey, libItem, sourceLabel);

        const overlay = {};
        split.overlay.forEach((field) => { overlay[field] = extra[field]; });

        return { instanceId: idMap[item.id], libraryId: libraryId, overlay: overlay };
      });
    });

    Sheet.persistLibrary();

    try { localStorage.setItem(Sheet.characterKey(newId), JSON.stringify(blob)); } catch (error) {}
    Sheet.touchImportedCharacter(blob);
    return newId;
  };

  // v1 -> v2 import reading v1 data out of this browser's own localStorage.
  Sheet.importV1 = function importV1() {
    let v1 = null;
    try { v1 = JSON.parse(localStorage.getItem(Sheet.V1_STORAGE_KEY)); } catch (error) { v1 = null; }
    if (!v1) return null;
    return Sheet.importV1FromData(v1);
  };
})(window.Sheet = window.Sheet || {});

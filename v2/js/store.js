(function (Sheet) {
  'use strict';

  const ITEM_SECTIONS = Sheet.ITEM_SECTIONS;

  Sheet.generateId = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ==================== meta (roster index) ==================== */

  Sheet.meta = null;

  Sheet.loadMeta = function loadMeta() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(Sheet.META_KEY)) || {}; } catch (error) { saved = {}; }
    Sheet.meta = { version: 1, characters: Array.isArray(saved.characters) ? saved.characters : [], v1BannerDismissed: !!saved.v1BannerDismissed };
    return Sheet.meta;
  };

  Sheet.persistMeta = function persistMeta() {
    try { localStorage.setItem(Sheet.META_KEY, JSON.stringify(Sheet.meta)); } catch (error) {}
  };

  function touchMetaEntry(blob) {
    const entry = Sheet.meta.characters.find((c) => c.id === blob.id);
    const data = blob.data || {};
    const summary = { id: blob.id, name: data.AgentName || '', portrait: blob.portrait || '', sp2: data.SP2 || '', rp2: data.RP2 || '', updatedAt: Date.now() };
    if (entry) Object.assign(entry, summary);
    else Sheet.meta.characters.push(summary);
    Sheet.persistMeta();
  }

  /* ==================== library ==================== */

  Sheet.library = null;

  Sheet.loadLibrary = function loadLibrary() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(Sheet.LIBRARY_KEY)) || {}; } catch (error) { saved = {}; }
    const library = {};
    ITEM_SECTIONS.forEach(([key]) => { library[key] = Array.isArray(saved[key]) ? saved[key] : []; });
    Sheet.library = library;
    return Sheet.library;
  };

  Sheet.persistLibrary = function persistLibrary() {
    try { localStorage.setItem(Sheet.LIBRARY_KEY, JSON.stringify(Sheet.library)); } catch (error) {}
  };

  /* ==================== groups ==================== */

  Sheet.groups = null;

  Sheet.loadGroups = function loadGroups() {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(Sheet.GROUPS_KEY)) || []; } catch (error) { saved = []; }
    Sheet.groups = Array.isArray(saved) ? saved : [];
    return Sheet.groups;
  };

  Sheet.persistGroups = function persistGroups() {
    try { localStorage.setItem(Sheet.GROUPS_KEY, JSON.stringify(Sheet.groups)); } catch (error) {}
  };

  // One-time cleanup for browsers that picked up an earlier build's real "Core
  // Rulebook" group entity: the ungrouped bucket is now itself labeled "Core
  // Rulebook" (see Sheet.DEFAULT_GROUP_NAME), so a leftover real group with that
  // exact name is a duplicate — fold its items into "ungrouped" and remove it.
  // Safe no-op once that leftover group is gone.
  Sheet.migrateLegacyDefaultGroup = function migrateLegacyDefaultGroup() {
    const legacy = (Sheet.groups || []).find((g) => g.name === Sheet.DEFAULT_GROUP_NAME);
    if (!legacy) return;
    Sheet.ITEM_SECTIONS.forEach(([sectionKey]) => {
      Sheet.library[sectionKey] = (Sheet.library[sectionKey] || []).map((item) => (item.groupId === legacy.id ? { ...item, groupId: null } : item));
    });
    Sheet.persistLibrary();
    Sheet.groups = Sheet.groups.filter((g) => g.id !== legacy.id);
    Sheet.persistGroups();
  };

  /* ==================== character (active sheet) ==================== */

  Sheet.state = null;

  function defaultCharacterData() {
    const data = {};
    ['Awarness', 'Presence', 'Muscle', 'Reflexes', 'Hacking'].forEach((key) => { data[key] = 'd6'; });
    data.Barrier = 6;
    data.GW1 = '4'; data.GW2 = '4'; data.SP2 = '12'; data.RP2 = '12';
    return data;
  }

  Sheet.defaultCharacterBlob = function defaultCharacterBlob(id) {
    const items = {};
    ITEM_SECTIONS.forEach(([key]) => { items[key] = []; });
    const loadoutId = Sheet.generateId();
    return {
      id: id,
      data: defaultCharacterData(),
      hp: {},
      sc: {},
      scOpen: true,
      items: items,
      loadouts: [{ id: loadoutId, name: 'DEFAULT' }],
      activeLoadoutId: loadoutId,
      openRows: {},
      portrait: '',
    };
  };

  function fillCharacterDefaults(blob) {
    const data = blob.data || {};
    ['Awarness', 'Presence', 'Muscle', 'Reflexes', 'Hacking'].forEach((key) => { if (!data[key]) data[key] = 'd6'; });
    if (!data.Barrier) data.Barrier = 6;
    ['GW1', 'GW2'].forEach((key) => { if (data[key] == null) data[key] = '4'; });
    ['SP2', 'RP2'].forEach((key) => { if (data[key] == null) data[key] = '12'; });
    blob.data = data;

    const items = blob.items || {};
    ITEM_SECTIONS.forEach(([key]) => { if (!Array.isArray(items[key])) items[key] = []; });
    blob.items = items;

    let loadouts = Array.isArray(blob.loadouts) ? blob.loadouts.filter((l) => l && l.id) : [];
    if (!loadouts.length) loadouts = [{ id: Sheet.generateId(), name: 'DEFAULT' }];
    blob.loadouts = loadouts;
    if (!loadouts.some((l) => l.id === blob.activeLoadoutId)) blob.activeLoadoutId = loadouts[0].id;

    blob.hp = blob.hp || {};
    blob.sc = blob.sc || {};
    blob.scOpen = blob.scOpen !== false;
    blob.openRows = blob.openRows || {};
    blob.portrait = blob.portrait || '';
    return blob;
  }

  Sheet.loadCharacterState = function loadCharacterState(id) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(Sheet.characterKey(id))); } catch (error) { saved = null; }
    const blob = saved && saved.id ? saved : Sheet.defaultCharacterBlob(id);
    blob.id = id;
    fillCharacterDefaults(blob);
    blob.sectionAllOpen = {};
    blob.dialog = null;
    blob.loadoutDialog = null;
    blob.crop = null;
    Sheet.state = blob;
    return Sheet.state;
  };

  Sheet.persistCharacterStateImmediately = function persistCharacterStateImmediately() {
    if (!Sheet.state) return;
    const blob = Sheet.state;
    const toSave = {
      id: blob.id, data: blob.data, hp: blob.hp, sc: blob.sc, scOpen: blob.scOpen,
      items: blob.items, loadouts: blob.loadouts, activeLoadoutId: blob.activeLoadoutId,
      openRows: blob.openRows, portrait: blob.portrait,
    };
    try { localStorage.setItem(Sheet.characterKey(blob.id), JSON.stringify(toSave)); } catch (error) {}
    touchMetaEntry(blob);
  };

  let persistTimer;
  Sheet.persistCharacterState = function persistCharacterState() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(Sheet.persistCharacterStateImmediately, 250);
  };

  Sheet.createCharacter = function createCharacter(name) {
    const id = Sheet.generateId();
    const blob = Sheet.defaultCharacterBlob(id);
    if (name) blob.data.AgentName = name;
    try { localStorage.setItem(Sheet.characterKey(id), JSON.stringify(blob)); } catch (error) {}
    touchMetaEntry(blob);
    return id;
  };

  Sheet.deleteCharacter = function deleteCharacter(id) {
    try { localStorage.removeItem(Sheet.characterKey(id)); } catch (error) {}
    Sheet.meta.characters = Sheet.meta.characters.filter((c) => c.id !== id);
    Sheet.persistMeta();
  };

  Sheet.renameCharacter = function renameCharacter(id, name) {
    let blob;
    try { blob = JSON.parse(localStorage.getItem(Sheet.characterKey(id))); } catch (error) { blob = null; }
    if (!blob) return;
    blob.data = blob.data || {};
    blob.data.AgentName = name;
    try { localStorage.setItem(Sheet.characterKey(id), JSON.stringify(blob)); } catch (error) {}
    touchMetaEntry(blob);
    if (Sheet.state && Sheet.state.id === id) Sheet.state.data.AgentName = name;
  };

  Sheet.duplicateCharacter = function duplicateCharacter(id) {
    let blob;
    try { blob = JSON.parse(localStorage.getItem(Sheet.characterKey(id))); } catch (error) { blob = null; }
    if (!blob) return null;
    const clone = JSON.parse(JSON.stringify(blob));
    const newId = Sheet.generateId();
    clone.id = newId;
    clone.data = clone.data || {};
    clone.data.AgentName = (clone.data.AgentName || 'Agent') + ' (copy)';

    const loadoutIdMap = {};
    clone.loadouts = (clone.loadouts || []).map((loadout) => {
      const newLoadoutId = Sheet.generateId();
      loadoutIdMap[loadout.id] = newLoadoutId;
      return { ...loadout, id: newLoadoutId };
    });
    clone.activeLoadoutId = loadoutIdMap[clone.activeLoadoutId] || (clone.loadouts[0] && clone.loadouts[0].id);

    ITEM_SECTIONS.forEach(([sectionKey]) => {
      const instanceIdMap = {};
      const list = (clone.items && clone.items[sectionKey]) || [];
      list.forEach((instance) => { instanceIdMap[instance.instanceId] = Sheet.generateId(); });
      clone.items[sectionKey] = list.map((instance) => {
        const next = { ...instance, instanceId: instanceIdMap[instance.instanceId] };
        if (sectionKey === 'Equipment') {
          if (next.overlay) {
            next.overlay = { ...next.overlay };
            if (next.overlay.loadoutId) next.overlay.loadoutId = loadoutIdMap[next.overlay.loadoutId] || next.overlay.loadoutId;
            if (next.overlay.fittedId) next.overlay.fittedId = instanceIdMap[next.overlay.fittedId] || next.overlay.fittedId;
          }
          if (next.extra) {
            next.extra = { ...next.extra };
            if (next.extra.loadoutId) next.extra.loadoutId = loadoutIdMap[next.extra.loadoutId] || next.extra.loadoutId;
            if (next.extra.fittedId) next.extra.fittedId = instanceIdMap[next.extra.fittedId] || next.extra.fittedId;
          }
        }
        return next;
      });
    });

    try { localStorage.setItem(Sheet.characterKey(newId), JSON.stringify(clone)); } catch (error) {}
    touchMetaEntry(clone);
    return newId;
  };
})(window.Sheet = window.Sheet || {});

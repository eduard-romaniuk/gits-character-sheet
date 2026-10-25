(function (Sheet) {
  'use strict';

  function download(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }

  function slug(name) {
    return String(name || 'agent').replace(/[^\w\-]+/g, '-').toLowerCase();
  }

  Sheet.slugName = slug;

  // A character file that stands on its own: every library-linked item also carries a
  // copy of its Codex definition (`def`, with its group's name), so it can be imported
  // into a browser whose Codex doesn't have those items (a GM's, or an empty site).
  Sheet.buildPortableCharacter = function buildPortableCharacter(blob) {
    const portable = JSON.parse(JSON.stringify(blob));
    portable.portable = 1;
    Sheet.ITEM_SECTIONS.forEach(([sectionKey]) => {
      const split = Sheet.LIBRARY_FIELD_SPLIT[sectionKey];
      const list = (portable.items && portable.items[sectionKey]) || [];
      list.forEach((instance) => {
        const libItem = instance.libraryId && Sheet.findLibraryItem(sectionKey, instance.libraryId);
        if (!libItem) return;
        const def = {};
        split.def.forEach((field) => { def[field] = libItem[field]; });
        const group = libItem.groupId && (Sheet.groups || []).find((g) => g.id === libItem.groupId);
        def.group = group ? group.name : null;
        instance.def = def;
      });
    });
    return portable;
  };

  // Inverse of buildPortableCharacter: links every item that carries a `def` to a
  // matching Codex item, creating it (and its group) when this Codex has none. A group
  // is only created for an item that is added, never for one that matched an existing item.
  // Items without a `def` (older files) keep their libraryId as-is.
  function linkPortableItems(blob) {
    const sourceLabel = ((blob.data && blob.data.AgentName) || '').trim() || 'Agent';
    Sheet.ITEM_SECTIONS.forEach(([sectionKey]) => {
      const split = Sheet.LIBRARY_FIELD_SPLIT[sectionKey];
      const list = (blob.items && blob.items[sectionKey]) || [];
      list.forEach((instance) => {
        if (sectionKey === 'Equipment' && !instance.libraryId && instance.extra) Sheet.convertDamageField(instance.extra, instance);
        const def = instance.def;
        if (!def) return;
        const candidate = { id: Sheet.generateId(), groupId: null, name: def.name || '', notes: def.notes || '' };
        split.def.forEach((field) => { if (field !== 'name' && field !== 'notes') candidate[field] = def[field]; });
        instance.libraryId = Sheet.findOrCreateLibraryItem(sectionKey, candidate, sourceLabel);
        // The candidate object itself went into the Codex: give it its group.
        if (instance.libraryId === candidate.id) candidate.groupId = Sheet.findOrCreateGroup(def.group);
        delete instance.def;
      });
    });
    delete blob.portable;
    Sheet.persistLibrary();
    Sheet.persistGroups();
  }

  Sheet.exportCharacterById = function exportCharacterById(id) {
    let blob = null;
    try { blob = JSON.parse(localStorage.getItem(Sheet.characterKey(id))); } catch (error) { blob = null; }
    if (!blob) return;
    download(slug((blob.data || {}).AgentName) + '-sheet.json', Sheet.buildPortableCharacter(blob));
  };

  Sheet.importCharacterFile = function importCharacterFile(file) {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        const parsed = JSON.parse(fileReader.result);
        if (Sheet.looksLikeV1Export(parsed)) {
          // touchImportedCharacter is already called inside importV1FromData.
          const newId = Sheet.importV1FromData(parsed);
          if (!newId) throw new Error('empty v1 import');
        } else {
          const newId = Sheet.generateId();
          parsed.id = newId;
          linkPortableItems(parsed);
          localStorage.setItem(Sheet.characterKey(newId), JSON.stringify(parsed));
          Sheet.touchImportedCharacter(parsed);
        }
        Sheet.renderRosterView();
      } catch (error) {
        window.alert('That file could not be read as a character sheet.');
      }
    };
    fileReader.readAsText(file);
  };

  Sheet.touchImportedCharacter = function touchImportedCharacter(blob) {
    const data = blob.data || {};
    Sheet.meta.characters.push({ id: blob.id, name: data.AgentName || '', portrait: blob.portrait || '', sp2: data.SP2 || '', rp2: data.RP2 || '', updatedAt: Date.now() });
    Sheet.persistMeta();
  };

  Sheet.importIntoCurrentCharacter = function importIntoCurrentCharacter(file) {
    if (!Sheet.state) return;
    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        const parsed = JSON.parse(fileReader.result);
        const id = Sheet.state.id;
        parsed.id = id;
        linkPortableItems(parsed);
        localStorage.setItem(Sheet.characterKey(id), JSON.stringify(parsed));
        Sheet.loadCharacterState(id);
        Sheet.persistCharacterStateImmediately();
        Sheet.renderCharacterSheet();
      } catch (error) {
        window.alert('That file could not be read as a character sheet.');
      }
    };
    fileReader.readAsText(file);
  };

  Sheet.exportBackup = function exportBackup() {
    const characters = (Sheet.meta.characters || []).map((c) => {
      try { return JSON.parse(localStorage.getItem(Sheet.characterKey(c.id))); } catch (error) { return null; }
    }).filter(Boolean);
    download('gits-v2-backup.json', { meta: Sheet.meta, library: Sheet.library, groups: Sheet.groups, characters: characters });
  };

  Sheet.importBackupFile = function importBackupFile(file) {
    if (!window.confirm('This will replace the entire roster, library, and groups in this browser. Continue?')) return;
    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        const parsed = JSON.parse(fileReader.result);
        (Sheet.meta.characters || []).forEach((c) => { try { localStorage.removeItem(Sheet.characterKey(c.id)); } catch (error) {} });
        (parsed.characters || []).forEach((blob) => { try { localStorage.setItem(Sheet.characterKey(blob.id), JSON.stringify(blob)); } catch (error) {} });
        Sheet.meta = { version: 1, characters: (parsed.meta && parsed.meta.characters) || [] };
        Sheet.library = parsed.library || Sheet.library;
        Sheet.groups = parsed.groups || [];
        Sheet.persistMeta();
        Sheet.persistLibrary();
        Sheet.persistGroups();
        Sheet.migrateDamageDice();  // backups made before damage dice
        window.location.hash = '#/roster';
        Sheet.renderRosterView();
      } catch (error) {
        window.alert('That file could not be read as a v2 backup.');
      }
    };
    fileReader.readAsText(file);
  };
})(window.Sheet = window.Sheet || {});

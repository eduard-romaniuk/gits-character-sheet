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

  Sheet.exportCharacterById = function exportCharacterById(id) {
    let blob = null;
    try { blob = JSON.parse(localStorage.getItem(Sheet.characterKey(id))); } catch (error) { blob = null; }
    if (!blob) return;
    download(slug((blob.data || {}).AgentName) + '-sheet.json', blob);
  };

  Sheet.importCharacterFile = function importCharacterFile(file) {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        const parsed = JSON.parse(fileReader.result);
        const newId = Sheet.generateId();
        parsed.id = newId;
        localStorage.setItem(Sheet.characterKey(newId), JSON.stringify(parsed));
        Sheet.touchImportedCharacter(parsed);
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
        window.location.hash = '#/roster';
        Sheet.renderRosterView();
      } catch (error) {
        window.alert('That file could not be read as a v2 backup.');
      }
    };
    fileReader.readAsText(file);
  };
})(window.Sheet = window.Sheet || {});

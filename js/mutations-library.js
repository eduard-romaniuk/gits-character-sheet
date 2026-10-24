(function (Sheet) {
  'use strict';

  function countCharacterUsages(section, libraryId) {
    let count = 0;
    (Sheet.meta.characters || []).forEach((character) => {
      let blob = null;
      try { blob = JSON.parse(localStorage.getItem(Sheet.characterKey(character.id))); } catch (error) { blob = null; }
      if (!blob || !blob.items || !blob.items[section]) return;
      if (blob.items[section].some((instance) => instance.libraryId === libraryId)) count += 1;
    });
    return count;
  }

  // Removes every instance linked to libraryId from one character's blob, cascading to
  // any Equipment fitted to a removed instance (mirrors deleteItemEntry's cascade).
  // Mutates blob in place; returns whether anything was actually removed.
  function removeLibraryReferences(blob, section, libraryId) {
    const list = blob.items && blob.items[section];
    if (!Array.isArray(list)) return false;
    const idsToRemove = list.filter((instance) => instance.libraryId === libraryId).map((instance) => instance.instanceId);
    if (!idsToRemove.length) return false;

    if (section === 'Equipment') {
      const fittedIdOf = (instance) => (instance.overlay && instance.overlay.fittedId) || (instance.extra && instance.extra.fittedId);
      let changed = true;
      while (changed) {
        changed = false;
        list.forEach((instance) => {
          const fittedId = fittedIdOf(instance);
          if (fittedId && idsToRemove.indexOf(fittedId) >= 0 && idsToRemove.indexOf(instance.instanceId) < 0) {
            idsToRemove.push(instance.instanceId);
            changed = true;
          }
        });
      }
    }

    blob.items[section] = list.filter((instance) => idsToRemove.indexOf(instance.instanceId) < 0);
    return true;
  }

  // The library is the single source of truth: deleting an item removes it — and any
  // character's copy of it — everywhere, rather than leaving orphaned references
  // behind. The confirm prompt names how many characters are affected up front.
  Sheet.deleteLibraryItem = function deleteLibraryItem(section, libraryId) {
    const item = (Sheet.library[section] || []).find((i) => i.id === libraryId);
    if (!item) return;
    const usageCount = countCharacterUsages(section, libraryId);
    const message = usageCount
      ? 'Delete "' + item.name + '"? It will be permanently removed from ' + usageCount + ' character' + (usageCount > 1 ? 's' : '') + ' that use it.'
      : 'Delete "' + item.name + '"?';
    if (!window.confirm(message)) return;

    Sheet.library[section] = (Sheet.library[section] || []).filter((i) => i.id !== libraryId);
    Sheet.persistLibrary();

    (Sheet.meta.characters || []).forEach((character) => {
      let blob = null;
      try { blob = JSON.parse(localStorage.getItem(Sheet.characterKey(character.id))); } catch (error) { blob = null; }
      if (!blob || !removeLibraryReferences(blob, section, libraryId)) return;
      try { localStorage.setItem(Sheet.characterKey(character.id), JSON.stringify(blob)); } catch (error) {}
      if (Sheet.state && Sheet.state.id === character.id) Sheet.state.items[section] = blob.items[section];
    });

    Sheet.renderLibraryView();
  };
})(window.Sheet = window.Sheet || {});

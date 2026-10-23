(function (Sheet) {
  'use strict';

  const query = Sheet.query;

  function currentCharacterId(hash) {
    const match = hash.match(/^#\/character\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  Sheet.handleRoute = function handleRoute() {
    const hash = window.location.hash || '#/roster';
    const rosterEl = query('#view-roster');
    const libraryEl = query('#view-library');
    const characterEl = query('#view-character');
    [rosterEl, libraryEl, characterEl].forEach((el) => { if (el) el.hidden = true; });

    const characterId = currentCharacterId(hash);
    if (characterId) {
      characterEl.hidden = false;
      Sheet.loadCharacterState(characterId);
      Sheet.renderCharacterSheet();
      return;
    }
    if (hash === '#/library') {
      libraryEl.hidden = false;
      Sheet.renderLibraryView();
      return;
    }
    rosterEl.hidden = false;
    Sheet.renderRosterView();
  };

  Sheet.navigate = function navigate(hash) {
    if (window.location.hash === hash) { Sheet.handleRoute(); return; }
    window.location.hash = hash;
  };

  window.addEventListener('hashchange', Sheet.handleRoute);
})(window.Sheet = window.Sheet || {});

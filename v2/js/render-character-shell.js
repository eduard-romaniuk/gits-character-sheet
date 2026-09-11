(function (Sheet) {
  'use strict';

  const query = Sheet.query;

  Sheet.renderCharacterShell = function renderCharacterShell() {
    query('#characterTop').innerHTML = '<div class="top">'
      + '<h1>SECTION 9 &nbsp;//&nbsp; AGENT DOSSIER</h1>'
      + '<div class="tools">'
      + '<button class="btn ghost" data-action="backToRoster">← ROSTER</button>'
      + '<button class="btn" data-action="export">EXPORT</button>'
      + '<button class="btn" data-action="import">IMPORT</button>'
      + '<button class="btn ghost" data-action="reset">RESET</button>'
      + '<input type="file" id="importFile" accept=".json,application/json" class="sr-only">'
      + '</div></div>';
  };

  Sheet.resetCharacter = function resetCharacter() {
    if (!window.confirm('Reset this character sheet? Export first if you want to keep it.')) return;
    const id = Sheet.state.id;
    const blob = Sheet.defaultCharacterBlob(id);
    Sheet.state = blob;
    Sheet.state.sectionAllOpen = {};
    Sheet.state.dialog = null;
    Sheet.state.loadoutDialog = null;
    Sheet.state.crop = null;
    Sheet.persistCharacterStateImmediately();
    Sheet.renderCharacterSheet();
  };

  Sheet.renderCharacterSheet = function renderCharacterSheet() {
    Sheet.TEXT_FIELD_KEYS.forEach((fieldKey) => {
      const el = query('[data-field="' + fieldKey + '"]');
      if (el) el.value = Sheet.state.data[fieldKey] || '';
    });
    Sheet.renderCharacterShell();
    Sheet.renderPortrait();
    Sheet.renderAttributes();
    Sheet.renderConflictTracker();
    Sheet.renderHitLocations();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };
})(window.Sheet = window.Sheet || {});

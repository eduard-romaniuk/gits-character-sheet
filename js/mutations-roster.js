(function (Sheet) {
  'use strict';

  Sheet.duplicateCharacterAction = function duplicateCharacterAction(id) {
    Sheet.duplicateCharacter(id);
    Sheet.renderRosterView();
  };

  Sheet.deleteCharacterAction = function deleteCharacterAction(id) {
    const character = (Sheet.meta.characters || []).find((c) => c.id === id);
    const name = character ? (character.name || 'this agent') : 'this agent';
    if (!window.confirm('Delete "' + name + '"? This cannot be undone. Export first if you want to keep it.')) return;
    Sheet.deleteCharacter(id);
    Sheet.renderRosterView();
  };
})(window.Sheet = window.Sheet || {});

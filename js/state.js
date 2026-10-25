(function (Sheet) {
  'use strict';

  const toNumber = Sheet.toNumber;
  const clamp = Sheet.clamp;

  // Transient, non-persisted UI state (dialogs etc.) lives directly on Sheet.state
  // (dialog/loadoutDialog/crop/sectionAllOpen) — see store.js loadCharacterState.
  Sheet.ui = { libraryGroupId: 'ALL', librarySection: 'Setbacks', libraryEquipmentType: 'weapon', librarySearch: '', pickerDialog: null, groupDialog: null, characterDialog: null, settingsDialog: null };

  Sheet.isAttachment = (extraOrItem) => ((extraOrItem.extra || extraOrItem) || {}).type === 'attachment';
  Sheet.isSingleUse = (extra) => { const e = extra || {}; return e.single === undefined ? (e.qty !== undefined && e.qty !== '') : !!e.single; };
  Sheet.rankToDieLabel = (rank) => Sheet.RANK_DIE_LABELS[clamp(toNumber(rank, 1), 1, 6) - 1];

  // Row summary tags for the weapon/throwable flags that have no value of their own.
  Sheet.equipmentTags = (extra) => {
    const type = extra.type || 'weapon';
    const tags = [];
    if (type === 'weapon' && extra.attack === 'melee') tags.push('MELEE');
    if ((type === 'weapon' || type === 'throwable') && extra.explosive) tags.push('EXPLOSIVE');
    return tags;
  };

  // Damage used to be free text ("D8", "2d6", "Stun"); it is now one die from DAMAGE_DICE or ''.
  // Converts fields.damage in place. When the old text was more than a plain die it is kept
  // in notesOwner.notes ("Damage: 2d6"), so nothing is lost. Safe to run repeatedly: a value
  // that already is a die is left alone. Returns whether anything changed.
  Sheet.convertDamageField = (fields, notesOwner) => {
    const original = fields.damage == null ? '' : String(fields.damage).trim();
    if (original === '' || Sheet.DAMAGE_DICE.indexOf(original) >= 0) return false;
    const exact = /^d(4|6|8|10|12|20)$/i.exec(original);
    if (exact) { fields.damage = 'D' + exact[1]; return true; }
    const match = /d(4|6|8|10|12|20)\b/i.exec(original);
    fields.damage = match ? 'D' + match[1] : '';
    const notes = String(notesOwner.notes || '').trim();
    notesOwner.notes = (notes ? notes + '\n' : '') + 'Damage: ' + original;
    return true;
  };

  Sheet.weaponOptions = () => Sheet.resolveSectionItems('Equipment')
    .filter((item) => item.extra.loadoutId === Sheet.state.activeLoadoutId && (item.extra.type || 'weapon') === 'weapon')
    .map((item) => ({ value: item.instanceId, label: item.name }));

  Sheet.skillPointsTotal = () => Sheet.resolveSectionItems('Skills').reduce((sum, item) => sum + toNumber(item.extra.rank, 0), 0)
    + Sheet.resolveSectionItems('SpecialtySkills').reduce((sum, item) => sum + toNumber(item.extra.rank, 0), 0);

  Sheet.requisitionPointsTotal = () => Sheet.requisitionPointsTotalFor(Sheet.state.activeLoadoutId);

  Sheet.requisitionPointsTotalFor = (loadoutId) => Sheet.resolveSectionItems('Equipment')
    .filter((item) => item.extra.loadoutId === loadoutId)
    .reduce((sum, item) => {
      const extra = item.extra;
      const units = Sheet.isSingleUse(extra) ? toNumber(extra.qty, 0) : 1;
      return sum + toNumber(extra.cost, 0) * units;
    }, 0);
})(window.Sheet = window.Sheet || {});

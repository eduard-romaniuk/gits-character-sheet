(function (Sheet) {
  'use strict';

  const toNumber = Sheet.toNumber;
  const clamp = Sheet.clamp;

  // Transient, non-persisted UI state (dialogs etc.) lives directly on Sheet.state
  // (dialog/loadoutDialog/crop/sectionAllOpen) — see store.js loadCharacterState.
  Sheet.ui = { libraryGroupId: 'ALL', librarySection: 'Setbacks', libraryEquipmentType: 'weapon', librarySearch: '', pickerDialog: null, groupDialog: null, characterDialog: null };

  Sheet.isAttachment = (extraOrItem) => ((extraOrItem.extra || extraOrItem) || {}).type === 'attachment';
  Sheet.isSingleUse = (extra) => { const e = extra || {}; return e.single === undefined ? (e.qty !== undefined && e.qty !== '') : !!e.single; };
  Sheet.rankToDieLabel = (rank) => Sheet.RANK_DIE_LABELS[clamp(toNumber(rank, 1), 1, 6) - 1];

  Sheet.weaponOptions = () => Sheet.resolveSectionItems('Equipment')
    .filter((item) => item.extra.loadoutId === Sheet.state.activeLoadoutId && (item.extra.type || 'weapon') === 'weapon')
    .map((item) => ({ value: item.instanceId, label: item.name }));

  Sheet.skillPointsTotal = () => Sheet.resolveSectionItems('Skills').reduce((sum, item) => sum + toNumber(item.extra.rank, 0), 0)
    + Sheet.resolveSectionItems('SpecialtySkills').reduce((sum, item) => sum + toNumber(item.extra.rank, 0), 0);

  Sheet.requisitionPointsTotal = () => Sheet.resolveSectionItems('Equipment')
    .filter((item) => item.extra.loadoutId === Sheet.state.activeLoadoutId)
    .reduce((sum, item) => {
      const extra = item.extra;
      const units = Sheet.isSingleUse(extra) ? toNumber(extra.qty, 0) : 1;
      return sum + toNumber(extra.cost, 0) * units;
    }, 0);
})(window.Sheet = window.Sheet || {});

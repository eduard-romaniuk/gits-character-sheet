(function (Sheet) {
  'use strict';

  const toNumber = Sheet.toNumber;
  const query = Sheet.query;

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.matches('[data-field]')) {
      Sheet.state.data[target.getAttribute('data-field')] = target.value;
      Sheet.persistState();
      const fieldKey = target.getAttribute('data-field');
      if (fieldKey === 'SP2' || fieldKey === 'RP2') Sheet.renderTotals();
      return;
    }
    if (target.id === 'dialogCost') { if (Sheet.state.dialog) Sheet.state.dialog.extra.cost = target.value; return; }
    if (target.matches('[data-dialog-field]') && Sheet.state.dialog) { Sheet.state.dialog.extra[target.getAttribute('data-dialog-field')] = target.value; return; }
    if (target.id === 'cropZoomRange' && Sheet.state.crop) { Sheet.state.crop.zoom = toNumber(target.value, 1); Sheet.updateCropImage(); }
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'importFile' && event.target.files[0]) Sheet.importSheet(event.target.files[0]);
    if (event.target.id === 'portraitFile' && event.target.files[0]) { Sheet.openPortraitCropDialog(event.target.files[0]); event.target.value = ''; }
  });

  document.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.getAttribute('data-action');
      const sectionKey = actionEl.getAttribute('data-section');
      const itemId = actionEl.getAttribute('data-id');
      const delta = toNumber(actionEl.getAttribute('data-delta'), 1);
      switch (action) {
        case 'export': Sheet.exportSheet(); return;
        case 'import': query('#importFile').click(); return;
        case 'reset':
          if (window.confirm('Clear this character sheet? Export first if you want to keep it.')) {
            localStorage.removeItem(Sheet.STORAGE_KEY);
            window.location.reload();
          }
          return;
        case 'die': Sheet.stepDie(actionEl.getAttribute('data-key'), delta); return;
        case 'barrier': Sheet.stepBarrier(delta); return;
        case 'conflict': Sheet.stepConflictMark(actionEl.getAttribute('data-key'), 1); return;
        case 'hp': Sheet.stepHitBox(actionEl.getAttribute('data-key'), 1, Sheet.HIT_LETHAL_STATES); return;
        case 'hpClear':
          if (window.confirm('Clear all hit point marks?')) {
            Sheet.state.hp = {};
            Sheet.persistState();
            Sheet.renderHitLocations();
          }
          return;
        case 'hpHintToggle': {
          const hint = query('#hpHint');
          hint.hidden = !hint.hidden;
          actionEl.setAttribute('aria-expanded', String(!hint.hidden));
          return;
        }
        case 'conflictToggle': Sheet.state.scOpen = !Sheet.state.scOpen; Sheet.persistState(); Sheet.renderConflictTracker(); return;
        case 'toggleRow': Sheet.toggleItemRow(sectionKey, itemId); return;
        case 'toggleAll': Sheet.toggleAllRows(sectionKey); return;
        case 'quantity': Sheet.adjustItemUse(sectionKey, itemId, delta); return;
        case 'add': Sheet.openItemDialog(sectionKey, null); return;
        case 'edit': Sheet.openItemDialog(sectionKey, (Sheet.state.items[sectionKey] || []).filter((item) => item.id === itemId)[0]); return;
        case 'del': Sheet.deleteItemEntry(sectionKey, itemId); return;
        case 'dlgType':
          Sheet.collectDialogInputs();
          Sheet.state.dialog.extra.type = actionEl.getAttribute('data-type');
          if (Sheet.state.dialog.extra.type === 'attachment' && !Sheet.state.dialog.extra.fittedId) {
            const weapon = Sheet.weaponOptions()[0];
            if (weapon) Sheet.state.dialog.extra.fittedId = weapon.value;
          }
          Sheet.renderItemDialog();
          return;
        case 'dlgSingle':
          Sheet.collectDialogInputs();
          Sheet.state.dialog.extra.single = !Sheet.isSingleUse(Sheet.state.dialog.extra);
          Sheet.renderItemDialog();
          return;
        case 'dlgStep': {
          Sheet.collectDialogInputs();
          const fieldKey = actionEl.getAttribute('data-key');
          const lo = toNumber(actionEl.getAttribute('data-min'), 1);
          let hi = toNumber(actionEl.getAttribute('data-max'), 6);
          if (fieldKey === 'rank' && Sheet.state.dialog.section === 'SpecialtySkills') hi = Math.max(1, toNumber(Sheet.state.dialog.extra.maxRanks, 1));
          Sheet.state.dialog.extra[fieldKey] = Sheet.clamp(toNumber(Sheet.state.dialog.extra[fieldKey], lo) + delta, lo, hi);
          if (fieldKey === 'maxRanks') Sheet.state.dialog.extra.rank = Sheet.clamp(toNumber(Sheet.state.dialog.extra.rank, 1), 1, Sheet.state.dialog.extra.maxRanks);
          Sheet.renderItemDialog();
          return;
        }
        case 'dlgCancel': if (Sheet.state.loadoutDialog) { Sheet.closeLoadoutDialog(); } else { Sheet.closeItemDialog(); } return;
        case 'dlgSave': if (Sheet.state.loadoutDialog) { Sheet.saveLoadoutDialog(); } else { Sheet.saveItemDialog(); } return;
        case 'dlgCopyToLoadout': Sheet.copyItemToLoadout(actionEl); return;
        case 'loadoutSelect': Sheet.activateLoadout(actionEl.getAttribute('data-loadout-id')); return;
        case 'loadoutAdd': Sheet.openLoadoutDialog(null); return;
        case 'loadoutEdit': Sheet.openLoadoutDialog((Sheet.state.loadouts || []).filter((loadout) => loadout.id === actionEl.getAttribute('data-loadout-id'))[0]); return;
        case 'loadoutDelete': Sheet.deleteLoadout(actionEl.getAttribute('data-loadout-id')); return;
        case 'cropCancel': Sheet.closeCropDialog(); return;
        case 'cropSave': Sheet.savePortraitCrop(); return;
      }
    }
    if (event.target.closest('#portrait')) { query('#portraitFile').click(); return; }
  });

  document.addEventListener('contextmenu', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) {
      if (event.target.closest('#portrait') && Sheet.state.portrait) {
        event.preventDefault();
        if (window.confirm('Remove the portrait?')) { Sheet.state.portrait = ''; Sheet.persistState(); Sheet.renderPortrait(); }
      }
      return;
    }
    const action = actionEl.getAttribute('data-action');
    if (action === 'conflict') { event.preventDefault(); Sheet.stepConflictMark(actionEl.getAttribute('data-key'), -1); }
    if (action === 'hp') { event.preventDefault(); Sheet.stepHitBox(actionEl.getAttribute('data-key'), -1); }
  });

  document.addEventListener('mousedown', (event) => {
    if (event.button === 1 && event.target.closest('[data-action="hp"]')) event.preventDefault();
  });

  document.addEventListener('auxclick', (event) => {
    if (event.button !== 1) return;
    const actionEl = event.target.closest('[data-action="hp"]');
    if (!actionEl) return;
    event.preventDefault();
    Sheet.stepHitBox(actionEl.getAttribute('data-key'), 1, Sheet.HIT_NONLETHAL_STATES);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && Sheet.state.loadoutDialog) { Sheet.closeLoadoutDialog(); return; }
    if (event.key === 'Escape' && Sheet.state.dialog) { Sheet.closeItemDialog(); return; }
    if (event.key === 'Escape' && Sheet.state.crop) { Sheet.closeCropDialog(); return; }
    const actionEl = event.target.closest && event.target.closest('[data-action="conflict"],[data-action="hp"]');
    if (actionEl && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); actionEl.click(); }
  });
})(window.Sheet = window.Sheet || {});

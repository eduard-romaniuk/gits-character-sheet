(function (Sheet) {
  'use strict';

  const toNumber = Sheet.toNumber;
  const query = Sheet.query;

  function activeDialogKind() {
    // itemStandalone is checked before picker: "+ CREATE NEW" opens it on top of an
    // still-open picker (kept around so saving can link the new item back onto the
    // character), so when both are set the standalone dialog is the one actually shown.
    if (Sheet.ui.itemDialog) return 'itemStandalone';
    if (Sheet.ui.pickerDialog) return 'picker';
    if (Sheet.state && Sheet.state.instanceDialog) return 'itemInstance';
    if (Sheet.state && Sheet.state.loadoutDialog) return 'loadout';
    if (Sheet.ui.groupDialog) return 'group';
    if (Sheet.ui.characterDialog) return 'character';
    if (Sheet.ui.settingsDialog) return 'settings';
    if (Sheet.state && Sheet.state.crop) return 'crop';
    return null;
  }

  function closeActiveDialog() {
    switch (activeDialogKind()) {
      case 'picker': Sheet.closeItemPicker(); return;
      case 'itemStandalone':
        // Cancelling out of "+ CREATE NEW" returns to the picker it was opened from
        // (still set behind it, filters intact) instead of closing everything.
        if (Sheet.ui.itemDialog.fromPicker && Sheet.ui.pickerDialog) { Sheet.ui.itemDialog = null; Sheet.renderItemPicker(); return; }
        Sheet.closeStandaloneItemDialog();
        return;
      case 'itemInstance': Sheet.closeInstanceDialog(); return;
      case 'loadout': Sheet.closeLoadoutDialog(); return;
      case 'group': Sheet.closeGroupDialog(); return;
      case 'character': Sheet.closeCharacterDialog(); return;
      case 'settings': Sheet.closeSettingsDialog(); return;
      case 'crop': Sheet.closeCropDialog(); return;
    }
  }

  function saveActiveDialog() {
    switch (activeDialogKind()) {
      case 'itemStandalone': Sheet.saveStandaloneItemDialog(); return;
      case 'itemInstance': Sheet.saveInstanceDialog(); return;
      case 'loadout': Sheet.saveLoadoutDialog(); return;
      case 'group': Sheet.saveGroupDialog(); return;
      case 'character': Sheet.saveCharacterDialog(); return;
      case 'crop': Sheet.savePortraitCrop(); return;
    }
  }

  function rawInstance(section, instanceId) {
    return (Sheet.state.items[section] || []).find((i) => i.instanceId === instanceId);
  }

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.matches('[data-field]')) {
      const fieldKey = target.getAttribute('data-field');
      let value = target.value;
      if (fieldKey === 'AgentId') { value = Sheet.formatAgentId(value); target.value = value; }
      Sheet.state.data[fieldKey] = value;
      Sheet.persistCharacterState();
      if (fieldKey === 'SP2' || fieldKey === 'RP2') Sheet.renderTotals();
      return;
    }
    if (target.id === 'dialogCost') { if (Sheet.ui.itemDialog) Sheet.ui.itemDialog.extra.cost = target.value; return; }
    if (target.matches('[data-dialog-field]') && Sheet.ui.itemDialog) { Sheet.ui.itemDialog.extra[target.getAttribute('data-dialog-field')] = target.value; return; }
    if (target.matches('[data-instance-field]') && Sheet.state && Sheet.state.instanceDialog) { Sheet.state.instanceDialog.overlay[target.getAttribute('data-instance-field')] = target.value; return; }
    if (target.id === 'librarySearch') { Sheet.setLibrarySearch(target.value); return; }
    if (target.id === 'pickerSearch') { Sheet.setPickerSearch(target.value); return; }
    if (target.id === 'cropZoomRange' && Sheet.state && Sheet.state.crop) { Sheet.state.crop.zoom = toNumber(target.value, 1); Sheet.updateCropImage(); }
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'importFile' && event.target.files[0]) { Sheet.importIntoCurrentCharacter(event.target.files[0]); event.target.value = ''; }
    if (event.target.id === 'importCharacterFile' && event.target.files[0]) { Sheet.importCharacterFile(event.target.files[0]); event.target.value = ''; }
    if (event.target.id === 'importBackupFile' && event.target.files[0]) { Sheet.importBackupFile(event.target.files[0]); event.target.value = ''; }
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
        /* ---- navigation ---- */
        case 'backToRoster': Sheet.navigate('#/roster'); return;
        case 'openLibrary': Sheet.navigate('#/library'); return;
        case 'openCharacter': Sheet.navigate('#/character/' + actionEl.getAttribute('data-character-id')); return;

        /* ---- roster ---- */
        case 'newCharacter': Sheet.openCharacterDialog(null); return;
        case 'renameCharacter': {
          const character = (Sheet.meta.characters || []).find((c) => c.id === actionEl.getAttribute('data-character-id'));
          Sheet.openCharacterDialog(character || { id: actionEl.getAttribute('data-character-id'), name: '' });
          return;
        }
        case 'duplicateCharacter': Sheet.duplicateCharacterAction(actionEl.getAttribute('data-character-id')); return;
        case 'deleteCharacter': Sheet.deleteCharacterAction(actionEl.getAttribute('data-character-id')); return;
        case 'exportCharacter': Sheet.exportCharacterById(actionEl.getAttribute('data-character-id')); return;
        case 'importCharacter': query('#importCharacterFile').click(); return;
        case 'importV1': {
          const id = Sheet.importV1();
          if (id) { Sheet.meta.v1BannerDismissed = true; Sheet.persistMeta(); Sheet.renderRosterView(); }
          return;
        }
        case 'dismissV1Banner': Sheet.meta.v1BannerDismissed = true; Sheet.persistMeta(); Sheet.renderRosterView(); return;

        /* ---- settings ---- */
        case 'openSettings': Sheet.openSettingsDialog(); return;
        case 'dlgToggleAlign': Sheet.toggleSettingsAlignment(); return;
        case 'dlgToggleShowAgentId': Sheet.toggleSettingsShowAgentId(); return;

        /* ---- character shell ---- */
        case 'export': Sheet.exportCharacterById(Sheet.state.id); return;
        case 'import': query('#importFile').click(); return;
        case 'reset': Sheet.resetCharacter(); return;

        /* ---- attributes / conflict / hp ---- */
        case 'die': Sheet.stepDie(actionEl.getAttribute('data-key'), delta); return;
        case 'barrier': Sheet.stepBarrier(delta); return;
        case 'conflict': Sheet.stepConflictMark(actionEl.getAttribute('data-key'), 1); return;
        case 'hp': Sheet.stepHitBox(actionEl.getAttribute('data-key'), 1, Sheet.HIT_LETHAL_STATES); return;
        case 'hpClear':
          if (window.confirm('Clear all hit point marks?')) { Sheet.state.hp = {}; Sheet.persistCharacterState(); Sheet.renderHitLocations(); }
          return;
        case 'hpHintToggle': {
          const hint = query('#hpHint');
          hint.hidden = !hint.hidden;
          actionEl.setAttribute('aria-expanded', String(!hint.hidden));
          return;
        }
        case 'conflictToggle': Sheet.state.scOpen = !Sheet.state.scOpen; Sheet.persistCharacterState(); Sheet.renderConflictTracker(); return;

        /* ---- item rows ---- */
        case 'toggleRow': Sheet.toggleItemRow(sectionKey, itemId); return;
        case 'toggleAll': Sheet.toggleAllRows(sectionKey); return;
        case 'quantity': Sheet.adjustItemUse(sectionKey, itemId, delta); return;
        case 'addFromLibrary': Sheet.openItemPicker(sectionKey); return;
        case 'edit': {
          const instance = rawInstance(sectionKey, itemId);
          if (!instance) return;
          if (instance.libraryId) Sheet.openInstanceDialog(sectionKey, itemId);
          else Sheet.openStandaloneItemDialog('character', sectionKey, instance);
          return;
        }
        case 'del': Sheet.deleteItemEntry(sectionKey, itemId); return;

        /* ---- item dialog (standalone / library) ---- */
        case 'dlgType':
          Sheet.collectStandaloneDialogInputs();
          Sheet.ui.itemDialog.extra.type = actionEl.getAttribute('data-type');
          if (Sheet.ui.itemDialog.extra.type === 'attachment' && !Sheet.ui.itemDialog.extra.fittedId) {
            const weapon = Sheet.weaponOptions()[0];
            if (weapon) Sheet.ui.itemDialog.extra.fittedId = weapon.value;
          }
          Sheet.renderStandaloneItemDialog();
          return;
        case 'dlgSingle':
          Sheet.collectStandaloneDialogInputs();
          Sheet.ui.itemDialog.extra.single = !Sheet.isSingleUse(Sheet.ui.itemDialog.extra);
          Sheet.renderStandaloneItemDialog();
          return;
        case 'dlgStep': {
          Sheet.collectStandaloneDialogInputs();
          const fieldKey = actionEl.getAttribute('data-key');
          const lo = toNumber(actionEl.getAttribute('data-min'), 1);
          let hi = toNumber(actionEl.getAttribute('data-max'), 6);
          if (fieldKey === 'rank' && Sheet.ui.itemDialog.section === 'SpecialtySkills') hi = Math.max(1, toNumber(Sheet.ui.itemDialog.extra.maxRanks, 1));
          Sheet.ui.itemDialog.extra[fieldKey] = Sheet.clamp(toNumber(Sheet.ui.itemDialog.extra[fieldKey], lo) + delta, lo, hi);
          if (fieldKey === 'maxRanks') Sheet.ui.itemDialog.extra.rank = Sheet.clamp(toNumber(Sheet.ui.itemDialog.extra.rank, 1), 1, Sheet.ui.itemDialog.extra.maxRanks);
          Sheet.renderStandaloneItemDialog();
          return;
        }
        case 'dlgCopyToLoadout': Sheet.copyItemToLoadout(actionEl); return;
        case 'dlgPromote': Sheet.promoteStandaloneDialogToLibrary(); return;

        /* ---- linked instance dialog ---- */
        case 'dlgInstanceStep': {
          Sheet.collectInstanceDialogInputs();
          const fieldKey = actionEl.getAttribute('data-key');
          const lo = toNumber(actionEl.getAttribute('data-min'), 1);
          const hi = toNumber(actionEl.getAttribute('data-max'), 6);
          Sheet.state.instanceDialog.overlay[fieldKey] = Sheet.clamp(toNumber(Sheet.state.instanceDialog.overlay[fieldKey], lo) + delta, lo, hi);
          Sheet.renderInstanceDialog();
          return;
        }
        case 'dlgInstanceRemove': Sheet.removeInstanceDialog(); return;
        case 'dlgInstanceDetach': Sheet.detachInstanceDialogAction(); return;

        /* ---- item picker ---- */
        case 'pickerGroup': Sheet.setPickerGroup(actionEl.getAttribute('data-group-id')); return;
        case 'pickerEquipmentType': Sheet.setPickerEquipmentType(actionEl.getAttribute('data-equipment-type')); return;
        case 'pickerChoose': Sheet.pickLibraryItem(actionEl.getAttribute('data-library-id')); return;
        case 'pickerCreateNew': Sheet.openCreateFromPicker(); return;

        /* ---- loadouts ---- */
        case 'loadoutSelect': Sheet.activateLoadout(actionEl.getAttribute('data-loadout-id')); return;
        case 'loadoutAdd': Sheet.openLoadoutDialog(null); return;
        case 'loadoutEdit': Sheet.openLoadoutDialog((Sheet.state.loadouts || []).filter((loadout) => loadout.id === actionEl.getAttribute('data-loadout-id'))[0]); return;
        case 'loadoutDelete': Sheet.deleteLoadout(actionEl.getAttribute('data-loadout-id')); return;

        /* ---- library ---- */
        case 'libraryGroup': Sheet.ui.libraryGroupId = actionEl.getAttribute('data-group-id'); Sheet.renderLibraryView(); return;
        case 'librarySection': Sheet.ui.librarySection = actionEl.getAttribute('data-section'); Sheet.renderLibraryView(); return;
        case 'libraryEquipmentType':
          Sheet.ui.librarySection = 'Equipment';
          Sheet.ui.libraryEquipmentType = actionEl.getAttribute('data-equipment-type');
          Sheet.renderLibraryView();
          return;
        case 'libraryAdd': {
          const defaultGroupId = ['ALL', 'UNGROUPED'].indexOf(Sheet.ui.libraryGroupId) < 0 ? Sheet.ui.libraryGroupId : null;
          const lockedType = sectionKey === 'Equipment' ? Sheet.ui.libraryEquipmentType : null;
          Sheet.openStandaloneItemDialog('library', sectionKey, null, defaultGroupId, false, lockedType);
          return;
        }
        case 'libraryEdit': {
          const libItem = (Sheet.library[sectionKey] || []).find((i) => i.id === itemId);
          if (libItem) Sheet.openStandaloneItemDialog('library', sectionKey, libItem);
          return;
        }
        case 'libraryDelete': Sheet.deleteLibraryItem(sectionKey, itemId); return;
        case 'groupAdd': Sheet.openGroupDialog(null); return;
        case 'groupEdit': Sheet.openGroupDialog((Sheet.groups || []).find((g) => g.id === actionEl.getAttribute('data-group-id'))); return;
        case 'groupDelete': Sheet.deleteGroup(actionEl.getAttribute('data-group-id')); return;

        /* ---- backup ---- */
        case 'exportBackup': Sheet.exportBackup(); return;
        case 'importBackup': query('#importBackupFile').click(); return;

        /* ---- generic dialog controls ---- */
        case 'dlgCancel': closeActiveDialog(); return;
        case 'dlgSave': saveActiveDialog(); return;
        case 'cropCancel': Sheet.closeCropDialog(); return;
        case 'cropSave': Sheet.savePortraitCrop(); return;
      }
    }
    if (event.target.closest('#portrait')) { query('#portraitFile').click(); return; }
  });

  document.addEventListener('contextmenu', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) {
      if (event.target.closest('#portrait') && Sheet.state && Sheet.state.portrait) {
        event.preventDefault();
        if (window.confirm('Remove the portrait?')) { Sheet.state.portrait = ''; Sheet.persistCharacterState(); Sheet.renderPortrait(); }
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
    if (event.key === 'Escape' && activeDialogKind()) { closeActiveDialog(); return; }
    const actionEl = event.target.closest && event.target.closest('[data-action="conflict"],[data-action="hp"]');
    if (actionEl && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); actionEl.click(); }
  });
})(window.Sheet = window.Sheet || {});

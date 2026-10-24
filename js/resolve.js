(function (Sheet) {
  'use strict';

  Sheet.findLibraryItem = function findLibraryItem(section, libraryId) {
    return (Sheet.library[section] || []).find((li) => li.id === libraryId) || null;
  };

  function buildDefBag(section, source) {
    const split = Sheet.LIBRARY_FIELD_SPLIT[section];
    const def = {};
    split.def.forEach((field) => { if (field !== 'name' && field !== 'notes') def[field] = source[field]; });
    return def;
  }

  // The library is the single source of truth for a linked item's def fields — there
  // is no orphan/fallback state, because deleting a library item cascades to remove
  // every character instance that referenced it (see Sheet.deleteLibraryItem). A
  // linked instance whose libraryId doesn't resolve indicates a data inconsistency
  // rather than a normal state, so it's simply dropped from the resolved list.
  Sheet.resolveItem = function resolveItem(section, instance) {
    const split = Sheet.LIBRARY_FIELD_SPLIT[section];

    if (!instance.libraryId) {
      return {
        instanceId: instance.instanceId, libraryId: null, isStandalone: true,
        name: instance.name || '', notes: instance.notes || '', extra: { ...(instance.extra || {}) },
      };
    }

    const libItem = Sheet.findLibraryItem(section, instance.libraryId);
    if (!libItem) return null;

    const overlay = instance.overlay || {};
    const extra = buildDefBag(section, libItem);
    split.overlay.forEach((field) => { extra[field] = overlay[field]; });
    return {
      instanceId: instance.instanceId, libraryId: instance.libraryId, isStandalone: false,
      name: libItem.name || '', notes: libItem.notes || '', extra: extra,
    };
  };

  Sheet.resolveSectionItems = function resolveSectionItems(section) {
    return (Sheet.state.items[section] || []).map((instance) => Sheet.resolveItem(section, instance)).filter(Boolean);
  };

  // Writes a single overlay (or standalone-extra) field on a character item instance.
  Sheet.setInstanceField = function setInstanceField(section, instanceId, field, value) {
    const list = Sheet.state.items[section] || [];
    const index = list.findIndex((i) => i.instanceId === instanceId);
    if (index < 0) return;
    const instance = list[index];
    if (instance.libraryId) {
      list[index] = { ...instance, overlay: { ...(instance.overlay || {}), [field]: value } };
    } else {
      list[index] = { ...instance, extra: { ...(instance.extra || {}), [field]: value } };
    }
    Sheet.state.items[section] = list;
  };

  // Creates a new character item instance linked to a library definition.
  Sheet.linkNewInstance = function linkNewInstance(section, libraryId, overlayDefaults) {
    const libItem = Sheet.findLibraryItem(section, libraryId);
    if (!libItem) return null;
    const instance = { instanceId: Sheet.generateId(), libraryId: libraryId, overlay: overlayDefaults || {} };
    Sheet.state.items[section] = (Sheet.state.items[section] || []).concat([instance]);
    return instance;
  };

  // Splits a standalone instance's flat field bag into a new library def + kept overlay, then links it.
  // (Standalone instances can no longer be created from the UI; this only matters for
  // legacy data from before the library became the single source of truth.)
  Sheet.promoteInstanceToLibrary = function promoteInstanceToLibrary(section, instanceId, groupId) {
    const list = Sheet.state.items[section] || [];
    const index = list.findIndex((i) => i.instanceId === instanceId);
    if (index < 0) return null;
    const instance = list[index];
    if (instance.libraryId) return null;
    const split = Sheet.LIBRARY_FIELD_SPLIT[section];
    const extra = instance.extra || {};

    const libItem = { id: Sheet.generateId(), groupId: groupId || null, name: instance.name || '', notes: instance.notes || '' };
    split.def.forEach((field) => { if (field !== 'name' && field !== 'notes') libItem[field] = extra[field]; });
    Sheet.library[section] = (Sheet.library[section] || []).concat([libItem]);
    Sheet.persistLibrary();

    const overlay = {};
    split.overlay.forEach((field) => { overlay[field] = extra[field]; });
    list[index] = { instanceId: instanceId, libraryId: libItem.id, overlay: overlay };
    Sheet.state.items[section] = list;
    return libItem;
  };

  // Inverse of promoteInstanceToLibrary: snapshots a linked instance's current
  // fully-resolved values (Codex def + this character's overlay, merged) into a
  // standalone instance. The character keeps that snapshot going forward — Codex
  // edits no longer reach it, and edits to it no longer reach the Codex or other
  // characters.
  Sheet.detachInstanceFromLibrary = function detachInstanceFromLibrary(section, instanceId) {
    const list = Sheet.state.items[section] || [];
    const index = list.findIndex((i) => i.instanceId === instanceId);
    if (index < 0) return null;
    const instance = list[index];
    if (!instance.libraryId) return null;
    const resolved = Sheet.resolveItem(section, instance);
    if (!resolved) return null;
    const detached = { instanceId: instance.instanceId, libraryId: null, name: resolved.name, notes: resolved.notes, extra: { ...resolved.extra } };
    list[index] = detached;
    Sheet.state.items[section] = list;
    return detached;
  };

  Sheet.buildLibraryDefBag = buildDefBag;
})(window.Sheet = window.Sheet || {});

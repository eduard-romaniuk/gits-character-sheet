(function (Sheet) {
  'use strict';

  Sheet.loadMeta();
  Sheet.loadLibrary();
  Sheet.loadGroups();
  Sheet.loadSettings();
  Sheet.migrateLegacyDefaultGroup();
  Sheet.applySettings();
  Sheet.handleRoute();
})(window.Sheet = window.Sheet || {});

(function (Sheet) {
  'use strict';

  Sheet.loadMeta();
  Sheet.loadLibrary();
  Sheet.loadGroups();
  Sheet.migrateLegacyDefaultGroup();
  Sheet.handleRoute();
})(window.Sheet = window.Sheet || {});

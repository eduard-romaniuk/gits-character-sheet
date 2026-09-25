(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;

  // Older saves may predate the AgentId field, so meta.characters won't have it
  // cached yet (touchMetaEntry only writes it on the next save) — fall back to
  // reading the character's own blob so the roster card still shows something.
  function resolveAgentId(character) {
    if (character.agentId) return character.agentId;
    try {
      const blob = JSON.parse(localStorage.getItem(Sheet.characterKey(character.id)));
      return (blob && blob.data && blob.data.AgentId) || '';
    } catch (error) { return ''; }
  }

  Sheet.renderRosterView = function renderRosterView() {
    // Sheet.meta.characters is already in stable creation order — new entries are
    // pushed to the end and existing ones updated in place (see touchMetaEntry in
    // store.js), so no re-sort here: oldest first, newest next to the ghost tile.
    const characters = Sheet.meta.characters || [];
    const v1Banner = (Sheet.detectV1Data && Sheet.detectV1Data() && !Sheet.meta.v1BannerDismissed)
      ? '<div class="panel v1-banner"><div class="col"><span class="label">A V1 CHARACTER SHEET WAS FOUND IN THIS BROWSER</span>'
        + '<div class="dialog-row"><button class="btn small" data-action="importV1">IMPORT FROM V1</button>'
        + '<button class="btn small ghost" data-action="dismissV1Banner">DISMISS</button></div></div></div>'
      : '';

    const showAgentId = !!(Sheet.settings && Sheet.settings.showAgentId);
    const rosterIdCardStyle = !!(Sheet.settings && Sheet.settings.rosterIdCardStyle);
    const cards = characters.map((character) => {
      const name = character.name || 'UNNAMED AGENT';
      const agentId = showAgentId ? resolveAgentId(character) : '';
      const brailleName = rosterIdCardStyle ? Sheet.brailleTransliterate(name) : '';
      const barcodeSvg = (rosterIdCardStyle && agentId) ? Sheet.code128Svg(agentId) : '';
      return '<div class="char-card" data-action="openCharacter" data-character-id="' + character.id + '">'
        + '<div class="char-card-portrait">' + (character.portrait ? '<img alt="" src="' + character.portrait + '">' : '<span>NO PHOTO</span>') + '</div>'
        + '<div class="char-card-body">'
        + '<div class="char-card-name">' + escapeHtml(name) + '</div>'
        + (brailleName ? '<div class="char-card-braille" aria-hidden="true">' + brailleName + '</div>' : '')
        + '<div class="char-card-meta">SP MAX ' + escapeHtml(character.sp2 || '0') + '  ·  RP MAX ' + escapeHtml(character.rp2 || '0') + '</div>'
          + (agentId ? '<div class="char-card-id">' + escapeHtml(agentId) + '</div>' : '')
          + (barcodeSvg ? '<div class="char-card-barcode" aria-hidden="true">' + barcodeSvg + '</div>' : '')
        + '</div>'
        + '<div class="char-card-actions">'
        + '<button class="icon" data-action="renameCharacter" data-character-id="' + character.id + '" aria-label="Rename" title="Rename">' + Sheet.ICONS.edit + '</button>'
        + '<button class="icon" data-action="duplicateCharacter" data-character-id="' + character.id + '" aria-label="Duplicate" title="Duplicate">' + Sheet.ICONS.duplicate + '</button>'
        + '<button class="icon" data-action="exportCharacter" data-character-id="' + character.id + '" aria-label="Export" title="Export">' + Sheet.ICONS.export + '</button>'
        + '<button class="icon delete" data-action="deleteCharacter" data-character-id="' + character.id + '" aria-label="Delete" title="Delete">' + Sheet.ICONS.delete + '</button>'
        + '</div></div>';
    }).join('');

    const ghostCard = '<div class="char-card ghost" data-action="newCharacter">'
      + '<div class="char-card-portrait"><span class="ghost-glyph">?</span></div>'
      + '<div class="char-card-body"><div class="char-card-name">+ NEW AGENT</div></div>'
      + '</div>';

    query('#view-roster').innerHTML = '<div class="top">'
      + '<h1>SECTION 9 &nbsp;//&nbsp; AGENT ROSTER</h1>'
      + '<div class="tools">'
      + '<button class="btn" data-action="openLibrary">CODEX</button>'
      + '<button class="btn ghost" data-action="importCharacter">IMPORT</button>'
      + '<input type="file" id="importCharacterFile" accept=".json,application/json" class="sr-only">'
      + '<button class="btn small" data-action="exportBackup">BACKUP ALL</button>'
      + '<button class="btn small ghost" data-action="importBackup">RESTORE BACKUP</button>'
      + '<input type="file" id="importBackupFile" accept=".json,application/json" class="sr-only">'
      + '<button class="btn small ghost" data-action="openSettings">SETTINGS</button>'
      + '</div></div>'
      + v1Banner
      + '<div class="char-grid">' + cards + ghostCard + '</div>';
  };
})(window.Sheet = window.Sheet || {});

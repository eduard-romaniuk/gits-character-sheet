(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;

  // Only 'perm' (permanent lethal damage) counts toward Injured/Destroyed — 'stun-perm'
  // (permanent non-lethal/stun) represents incapacitation, not physical injury.
  function locationStatus(key, count) {
    let permCount = 0;
    for (let index = 0; index < count; index++) {
      if (Sheet.state.hp[key + ':' + index] === 'perm') permCount++;
    }
    if (permCount === 0) return null;
    return permCount === count ? 'destroyed' : 'injured';
  }

  Sheet.renderHitLocations = function renderHitLocations() {
    query('#locations').innerHTML = Sheet.HIT_LOCATIONS.map(([label, range, key, count]) => {
      let boxes = '';
      for (let index = 0; index < count; index++) {
        const boxKey = key + ':' + index;
        const markState = Sheet.state.hp[boxKey] || '';
        boxes += '<div class="box ' + markState + '" data-action="hp" data-key="' + boxKey + '" role="button" tabindex="0"'
          + ' aria-label="' + label + ' hit box ' + (index + 1) + '"></div>';
      }
      const status = locationStatus(key, count);
      return '<div class="location">'
        + '<div class="location-header"><div class="location-range">' + range + '</div><div class="location-name">' + label + '</div>'
        + (status ? '<div class="location-status ' + status + '">' + (status === 'destroyed' ? 'DESTROYED' : 'INJURED') + '</div>' : '')
        + '</div>'
        + '<div class="location-body">'
        + '<div class="col" style="gap:5px"><div class="hint">HIT POINTS</div>'
        + '<div class="boxes">' + boxes + '</div></div>'
        + '<div class="col" style="gap:5px"><div class="hint">ARMOR</div>'
        + '<input class="field armor" data-field="' + key + '_Armor" inputmode="numeric" placeholder="0"'
        + ' value="' + escapeHtml(Sheet.state.data[key + '_Armor'] || '') + '" aria-label="' + label + ' armor"></div>'
        + '</div></div>';
    }).join('');
  };
})(window.Sheet = window.Sheet || {});

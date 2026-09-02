(function (Sheet) {
  'use strict';

  Sheet.STORAGE_KEY = 'gits-character-sheet-v1';
  Sheet.DICE_STEPS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  Sheet.RANK_DIE_LABELS = ['D4', 'D6', 'D8', 'D10', 'D12', 'D20'];
  Sheet.ITEM_SECTIONS = [
    ['Setbacks', 'SETBACKS'],
    ['Cybernetics', 'CYBERNETICS'],
    ['Skills', 'STANDARD SKILLS'],
    ['SpecialtySkills', 'SPECIALTY SKILLS'],
    ['Equipment', 'WEAPONS & EQUIPMENT'],
  ];
  Sheet.ITEM_FIELD_SCHEMA = {
    Cybernetics: [['armor', 'ARMOR'], ['damage', 'UNARMED DAMAGE']],
    Skills: [['rank', 'RANK', 'rank']],
    SpecialtySkills: [['maxRanks', 'MAX. RANKS', 'max'], ['rank', 'CURRENT RANK', 'cur']],
  };
  Sheet.EQUIPMENT_TYPES = [
    ['weapon', 'WEAPON'],
    ['attachment', 'ATTACHMENT'],
    ['armor', 'ARMOR'],
    ['throwable', 'THROWABLE'],
    ['utility', 'UTILITY'],
  ];
  Sheet.EQUIPMENT_FIELDS = {
    weapon: [['range', 'RANGE'], ['damage', 'DAMAGE'], ['rof', 'ROF'], ['cost', 'COST'], ['skill', 'SKILL']],
    armor: [['head', 'HEAD'], ['torso', 'TORSO'], ['arms', 'ARMS'], ['legs', 'LEGS'], ['cost', 'COST']],
    throwable: [['range', 'RANGE'], ['damage', 'DAMAGE'], ['qty', 'AMOUNT'], ['cost', 'COST'], ['skill', 'SKILL']],
    utility: [['cost', 'COST'], ['qty', 'AMOUNT']],
    attachment: [['mods', 'STAT MODIFIER'], ['cost', 'COST'], ['fittedId', 'FITTED TO', 'weapon']],
  };
  Sheet.META_LABEL_PREFIX = {
    range: 'RANGE', damage: 'DMG', rof: 'ROF', cost: 'COST',
    head: 'HEAD', torso: 'TORSO', arms: 'ARMS', legs: 'LEGS',
  };
  Sheet.ATTRIBUTE_GROUPS = [
    ['GHOST', [['Awarness', 'AWARENESS'], ['Presence', 'PRESENCE']]],
    ['SHELL', [['Muscle', 'MUSCLE'], ['Reflexes', 'REFLEXES']]],
  ];
  Sheet.HIT_LOCATIONS = [
    ['Head / Neck', '19–20', 'Head', 2],
    ['Torso', '11–18', 'Torso', 4],
    ['Left Arm', '7–8', 'LeftArm', 3],
    ['Right Arm', '9–10', 'RightArm', 3],
    ['Left Leg', '1–3', 'LeftLeg', 3],
    ['Right Leg', '4–6', 'RightLeg', 3],
  ];
  Sheet.CONFLICT_ROWS = ['12', '10', '8', '6'];
  Sheet.MARK_STATES = ['', 'temp', 'perm'];
  Sheet.HIT_LETHAL_STATES = ['', 'temp', 'perm'];
  Sheet.HIT_NONLETHAL_STATES = ['', 'stun-temp', 'stun-perm'];
  Sheet.TEXT_FIELD_KEYS = ['AgentName', 'PlayerName', 'BackStory', 'Aspect1', 'Aspect2', 'SC_Notes', 'GW1', 'GW2', 'SP2', 'RP2', 'Notes'];
})(window.Sheet = window.Sheet || {});

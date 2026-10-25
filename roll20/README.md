# Ghost in the Shell: Roll20 character sheet

A custom Roll20 character sheet for the Ghost in the Shell TTRPG, with exploding-dice rolls and themed chat cards. It is the Roll20 companion to the [character sheet website](https://eduard-romaniuk.github.io/gits-character-sheet/), and characters made on the website can be imported into it.

| File | What it is |
|---|---|
| `template.html` | Sheet layout, sheet workers and the `gits` roll template |
| `sheet.css` | Sheet styles |
| `sheet.json` | Sheet metadata |

## Setting up a campaign

Custom sheets need the game's creator to have a Roll20 **Pro** subscription.

1. Create a game, or open an existing one. Then go to **Settings → Game Settings**.
2. Under **Character Sheet Template**, choose **Custom**.
3. Copy the contents of `template.html` into the **HTML Layout** tab, and the contents of `sheet.css` into **CSS Styling**. Leave **Translation** empty.
4. Press **Save**.
5. Launch the game and create a character in the **Journal**. Under **Can Be Edited & Controlled By**, give the player control. The sheet is on the character's **Character Sheet** tab.
6. Optionally, import the character from the website (see [below](#importing-a-character-from-the-website)).

Tell players to pick their character in the chat's **As:** dropdown, so roll cards show the character's name.

To update the sheet later, paste the new `template.html` and `sheet.css` the same way and save. Characters keep their data. Anyone with the game open needs to reload the page.

## Features

### Tabs

- **CORE**: attributes (Ghost, Shell, Cyberbrain), Ghost-Whispers, skill and requisition points, the Synthesis Conflict track, hit points and armor per location, and notes.
- **PROFILE**: standard skills, specialty skills, setbacks and cybernetics.
- **GEAR**: weapons and equipment (weapon, attachment, armor, throwable and utility).
- **SETTINGS**: roll options, and import from the website.

New rows open in edit mode; save them with the check icon. After that a row shows a compact summary that expands for details. Each row can also be sent to chat (the speech bubble icon), as can hit points and Synthesis Conflict.

### Exploding dice

If a die rolls its highest value, it upgrades to the next die (D4 → D6 → D8 → D10 → D12 → D20), which is rolled too. The highest value counts. Clicking the die icon rolls:

- an **attribute**;
- a **standard skill**: the skill die plus its linked attribute;
- a **weapon attack**: one attack per click.

### Roll popups

Before rolling, the sheet asks two things:

- **Dice shift**: Upgrade or Downgrade, ×1 to ×3. Upgrading past D20 adds extra D20s (the highest counts), and downgrading past D4 adds extra D4s (the lowest counts).
- **Difficulty**: the card then shows **SUCCESS** or **FAILURE**. A result of at least twice the difficulty is a **CRITICAL SUCCESS**.

A roll where every first die shows 1 is a **CRITICAL FAILURE**.

Players who want faster rolls can turn either popup off in **SETTINGS → ROLLS**. This is set per character. Without a difficulty, a roll can't show success or failure, or be a critical success.

### Attacks and gear

An attack shows **HIT**, **CRITICAL HIT** or **MISSED**:

- a hit also rolls a hit location and damage;
- a miss stops there;
- a critical failure jams the weapon.

**Explosives**:

- They show **DIRECT HIT** / **CRITICAL DIRECT HIT** / **CRITICAL MISS**. A direct hit's damage die is one step higher.
- The card has **CLOSE PROXIMITY** and **CAUGHT IN THE BLAST** buttons, which roll splash damage for anyone else caught in it.

**Quantities**: items with a quantity have − / + buttons to use and restore one. Free (no-cost) units don't count toward requisition points.

### Free rolls

The **FREE ROLL: D4 … D20** strip next to the tabs rolls a single exploding die with no popup. Use it for anything the sheet doesn't cover.

## Importing a character from the website

1. On the [website](https://eduard-romaniuk.github.io/gits-character-sheet/), open the character and choose **EXPORT ▾ → ROLL20**. If the character has more than one loadout, pick one first. The character is copied to the clipboard.
2. In Roll20, open the character's **SETTINGS** tab. Paste into **IMPORT FROM WEBSITE** and press **IMPORT**.
3. Confirm with **REPLACE SHEET**. This clears everything on the sheet before filling it in.

Name, player, backstory and portrait are not imported. Roll20 keeps those on the character itself (the name, the Bio & Info tab and the avatar).

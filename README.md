# Mythic Fighters

A kid-friendly mythical-creature fighting game for the browser and iPad. Vanilla JS + canvas, no assets to download.

Play: https://jdizzy85.github.io/mythic-fighters/

## Features
- 10 mythical heroes, each with a Creature Ultimate and its own ranged bolt
- 24 weapons held in the creature's hand, each labeled CLOSE (melee) or RANGED. The Armory shows SPEED / POWER / REACH / COMBO / WEIGHT bars plus PROS and CONS (combo weapons end in a bigger finisher, heavy weapons slow you down)
- 7 huge scrolling arenas (about 2000-2400 px wide, some 4 tiers tall) with ramps, jump-up platforms, thin ledges you can drop through (hold BLOCK + JUMP), and moving lifts. AI fighters climb, drop and fight on platforms
- Dynamic camera: zooms out and pans to keep every fighter in view, zooms in when fighters are close (clamped, smoothly eased)
- BATTLE mode: up to 6 fighters, free-for-all (3/4/6), 2v2v2, 3v3, 2v2 or 1v1; any mix of CPU, P1 keys, P2 keys and touch; pick hero, weapon, arena; rules STOCKS (3 lives), KO RACE (first to 5) or TIMED (90 s); colored team rings, name tags and a 6-bar HUD; result scoreboard with coin/XP rewards
- SHOP hub: weapons, armor, upgrade points and Boosts & Training (XP Potion, Coin Charm, Phoenix Feather, Power Elixir, Armor Polish, Haste Tonic, Training Session, Hero Camp)
- Clear labels everywhere: CLOSE ATTACK, RANGED ATTACK, BLOCK, DODGE, ULTIMATE with key hints and cooldown timers on the HUD, touch buttons, How to Play and Armory
- Armor gear (helm, chest armor, gloves & boots, 5 tiers) drawn on your creature, an armor bar with damage reduction and plating
- XP + coin upgrades: LIFE (health, regen, lifesteal), ARMOR, SPEED (move, attack), POWER (attack, weapon, cooldowns, ultimate charge) with now/next values
- 30-level story with a tuned difficulty curve, 3-phase bosses, smarter AI and an EASY / NORMAL / HARD setting
- ENDLESS mode: infinite waves, random enemy variants and weapons, boss every 5 waves, pick-a-perk between waves, rewards, saved top-10 leaderboard and a game-over summary
- MISSIONS: 3 daily missions, tiered achievements, claim buttons and a daily streak bonus
- Duel vs AI mode. Everything saves in localStorage

## Controls
Solo / 1 keyboard player (also Story, Endless, Duel):
Move A/D or arrows, Jump W/Up/Space, Close Attack J/Z, Ranged Attack H/B, Block S/Down/Shift, Dodge U/V,
Ultimate O, Rage R, Pause P/Esc. On iPad use the labeled on-screen buttons.

Battle mode with 2+ keyboard players:
- P1: A/D move, W jump, S block, F close, G ranged, T ultimate, R or Y rage, Q dodge
- P2: arrows move/jump/block, Numpad1 (or .) close, Numpad2 (or /) ranged, Numpad5 (or ') ultimate, Numpad3 (or ,) rage, Numpad0 (or M) dodge
- Touch player: on-screen buttons (only shown when a TOUCH slot exists)
- Drop through a thin ledge: hold BLOCK + press JUMP

Gamepad (Xbox / standard mapping; also iPad Safari over Bluetooth): left stick or D-pad move, A / D-pad up / stick up jump, X close, Y ranged, RT ultimate, RB rage, LB block (hold), LT dodge, Start pause. Menus: D-pad/stick move, A confirm, B back, LB/RB change setup choices. In Battle, set slots to GAMEPAD 1-4 (auto-assigned when a controller connects). Touch buttons hide while a controller is active.

See BALANCE.md for the simulation-based difficulty tuning.

## v7
- RAGE bar for every fighter (1v1 HUD, 6-player HUD, touch button that glows when full). Fills from damage taken/dealt, successful blocks and dodges; when full press RAGE (touch button, R / P1: R or Y / P2: Numpad3 or `,` / gamepad RB) for 10 s: +25% jump height, +30% move speed, +30% attack speed, +30% attack power, flame aura; the bar drains with the timer and must refill. The AI uses it when a foe is close.
- Ranged cooldown 1.2-1.9 s (0.7 s thrown); ultimates are at least 12 s. Both are shown on HUD chips and touch buttons.
- Polish: squash and stretch, dust, hit sparks, thrust trails, ultimate wind-up + screen effects, KO fade, eased menu transitions.
- Robustness: NaN / out-of-bounds guard with respawn, camera always frames every living fighter, per-fighter draw isolation, touch UI re-asserted every frame, resize guards. See BALANCE.md for the bug hunt notes.

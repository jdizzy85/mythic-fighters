# Balance notes (v3, re-checked in v4)

Difficulty was tuned with headless AI-vs-AI simulations (the game's own fight loop, 60 fps steps, Dragon + Star Sword player).
"Average" = player AI aggression 0.6, "skilled" = 0.85. Upgraded player: hero level ~ 1 + 0.62 x level, balanced stat points, armor gear bought with ~60 coins/level.
Win rate over 60 fights per story level (levels 1-30; bosses are 5, 10, 15, 20, 25, 30):

| Player | Levels 1-4 | Level 5 (boss) | Levels 6-12 | Level 15 | Level 20 | Levels 22-27 | Level 30 (final boss) |
|---|---|---|---|---|---|---|---|
| Average, upgraded | 100% | 77% | 87-100% | 38% | 47% | 10-82% | 37% |
| Skilled, upgraded | 100% | 95% | 97-100% | 73% | 73% | 38-95% | 53% |
| Level 1, no upgrades or gear | 93-100% | 77% | 63-100% | 23% | 7% | 0-17% | 0% |

Endless median wave reached (40 runs each, random perks): new hero ~5, level 10 + some armor ~9, level 20 ~10-15, level 40 maxed + skilled ~20 (best runs 30+).
Tunables live in `STAGE`, `DIFFM` (EASY / NORMAL / HARD) and the endless formulas in `enemyFor()` in game.js.

## v4 re-check
Big arenas, combo chains/finishers and weight were added; sims re-run with the same method. Average upgraded player story win rate: L1-6 ~100%, L5 boss 85%, L15 ~30%, L20 ~45%, L25 ~30%, L30 ~17% (skilled: 59% / 70% / 51% / 46%). Enemy damage per stage was trimmed slightly (`dmK` .019 -> .0175).
Endless median wave (20 runs): new hero 6, level 10 ~8, level 20 ~14, level 40 maxed ~25.
Weapon check (AI mirror vs Star Sword, 1v1, 120 fights each): win rates roughly 18%-65%; sword/spear/whip/bow/katana/tome/crossbow/scythe/firewand sit near 45-60%, and slow or niche weapons (Titan Hammer, Star Shuriken, Skull Mace, Twin Blades) sit lower because the AI plays them poorly - they reward a human player's timing. Weights slow movement by 0-14%.

## v6 (Kick, Nitro and Weapon Skills removed)
Controls are now only: move, jump, close attack, ranged attack (cooldown), ultimate (cooldown), block, dodge. Weapons were re-tuned with the AI mirror sim (every weapon now wins about 45-69% vs the Star Sword; the old kick/skill damage was folded into base weapon damage; heavy melee weapons were raised, long-range weapons trimmed). Enemy damage per stage `dmK` .0175 -> .0145, enemy HP slope .033 -> .03 and boss damage .9 -> .72. Average upgraded player story win rate: L13 ~53%, L15 ~40%, L20 ~20%, L25 ~17%, L30 ~5% (skilled: 90% / 75% / 53% / 38% / 25%).
Upgrades: "Nitro Charge" became "Ultimate Charge" (ultimate recharges faster); Weapon Power / Cooldowns descriptions updated; the Endless perk and Nitro Tonic boost were retargeted (ult refresh + faster recharge, Haste Tonic = -30% cooldowns). Saved games keep their upgrade levels; old daily missions that used weapon skills are swapped for other missions automatically.

## v7 (Rage, cooldowns, bug hunt)
- Ranged cooldown: bolt 1.9 s, ranged weapon 1.2 s, thrown 0.7 s (x cooldown upgrades). Ultimate: max(12 s, creature value). Ultimates are always >= 6x the ranged cooldown.
- Rage tuning (RAGE constants in game.js): +0.45 x damage taken (+0.7 flat), +0.28 x damage dealt (+0.4 flat), +3 per block, +6 per dodge. In AI-vs-AI sims a fighter earns a full bar about every 30 s in 1v1 and every 26 s in 6-player free-for-all (about 1.2-1.5 rages per fighter per minute). Rage effects: +25% jump height, x1.3 speed / attack speed / damage for 10 s.
- Weapon mirror sim after the changes (60 matches per weapon each side, AI uses rage): every weapon wins 45-68% vs the Star Sword.
- Story sim (average upgraded player): L13 ~65%, L15 ~35%, L20 ~13%, L25 ~13%; skilled: L13 80%, L15 53%, L20 35%, L25 15%, L30 ~20%. Enemy damage per stage dmK .0145 -> .0138.

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

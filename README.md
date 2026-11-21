# Sokoban solver — room-split push-optimal

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-7c3aed)](https://make.fun/bounty/sokoban-solver-01-run-20261121)
[![Sokoban solver](https://img.shields.io/badge/solver-room--split%20push--optimal-blue)](https://make.fun/bounty/sokoban-solver-01-run-20261121)
[![Node 22](https://img.shields.io/badge/node-22-green)](https://make.fun/bounty/sokoban-solver-01-run-20261121)

Built for the [make.fun Sokoban solver bounty](https://make.fun/bounty/sokoban-solver-01-run-20261121).

Generated levels are a hallway with 1–4 rooms off it; a box pushed out of its room can never return, so the level optimum is the sum of the rooms' optima. The solver splits the board at the hallway, solves each room push-optimally with A* (min-assignment heuristic, transposition table, deadlock pruning), lets the player push from the hallway porch, solves a trapping room last, and stitches the rooms together with walking moves. Deterministic, no clock reads.

Run: `node main.ts` reads `/input/<id>/level.txt`, writes `/output/<id>/solution.txt` (`u/d/l/r`). Node 22, no dependencies. MIT — see `LICENSE`.

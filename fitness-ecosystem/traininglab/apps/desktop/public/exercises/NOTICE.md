# Exercise media — attribution & licenses

This folder ships two kinds of exercise media. Both are cleared for
redistribution in this open-source repository, but under different terms.

## 1. Animation GIFs (`gifs/*.gif`) + original stills — © Gym Visual

The 36 animation GIFs (and the stills that shipped with them) come from
**Gym Visual** (https://gymvisual.com/), redistributed here **with permission**,
under the same terms the `hasaneyldrm/exercises-dataset` project publishes:

- **Resolution**: distributed at **180×180 only**.
- **Attribution**: this notice must be preserved in every redistribution of the
  repository.

> © Gym visual — https://gymvisual.com/

Gym Visual's full Terms & Conditions of Use:
https://gymvisual.com/content/3-terms-and-conditions-of-use

If you fork this repository, keep this notice intact.

## 2. Reference stills (`images/<id>/0.jpg`, `1.jpg`) — Public domain

The per-exercise reference images come from the
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) project, which
dedicates them to the public domain (**Unlicense** — no attribution required,
no usage restrictions). We list the source anyway as good practice:

> Images sourced from https://github.com/yuhonas/free-exercise-db (Unlicense)

## What we deliberately did NOT ship

- **ExerciseDB** GIFs — their terms forbid redistribution as bundled files.
- **wger** images — mostly not clearly licensed for redistribution yet
  (their own issue tracker says so).
- Any GIF from re-host repositories without a license file (e.g. the
  "1,112 exercises" repo) — they are unlicensed re-hosts of ExerciseDB media.

## Coverage

The `asset-manifest.json` maps catalog ids to media. Exercises without an
entry fall back to an original animated stick-figure drawing (our own, no
license at all) inside the app.

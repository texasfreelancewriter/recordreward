#!/bin/bash
cd "/Users/kyledalton/Desktop/Record Reward/recordreward"

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git add -A
  git commit -m "Weekly auto-backup $(date '+%Y-%m-%d')"
  git push
fi

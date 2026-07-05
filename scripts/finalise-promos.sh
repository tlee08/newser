#!/usr/bin/env bash
set -euo pipefail

SRC="resources/promotion_images"
DST="resources/promotion_images_finalised"

echo "Collecting classic promo images..."
echo ""

question_count=0
answer_count=0

while IFS= read -r file; do
  # Path: <run-id>/<question-id>/classic-question.png
  qid=$(basename "$(dirname "$file")")
  rid=$(basename "$(dirname "$(dirname "$file")")")
  mkdir -p "$DST/$rid/question"
  cp "$file" "$DST/$rid/question/${qid}.png"
  echo "  question → $rid/question/${qid}.png"
  ((question_count++)) || true
done < <(find "$SRC" -name "classic-question.png" -type f | sort)

echo ""

while IFS= read -r file; do
  qid=$(basename "$(dirname "$file")")
  rid=$(basename "$(dirname "$(dirname "$file")")")
  mkdir -p "$DST/$rid/answer"
  cp "$file" "$DST/$rid/answer/${qid}.png"
  echo "  answer   → $rid/answer/${qid}.png"
  ((answer_count++)) || true
done < <(find "$SRC" -name "classic-answer.png" -type f | sort)

echo ""
echo "Done! $question_count questions, $answer_count answers copied to $DST/"

#!/usr/bin/env bash
set -euo pipefail

SRC="resources/promotion_images"
DST="resources/promotion_images_finalised"

mkdir -p "$DST/question" "$DST/answer"

echo "Collecting classic promo images..."
echo ""

question_count=0
answer_count=0

# Find all classic-question.png files
while IFS= read -r file; do
  # Extract question-id from path: <run-id>/<question-id>/classic-question.png
  dir=$(dirname "$file")
  qid=$(basename "$dir")
  cp "$file" "$DST/question/${qid}.png"
  echo "  question → ${qid}.png"
  ((question_count++)) || true
done < <(find "$SRC" -name "classic-question.png" -type f | sort)

echo ""

# Find all classic-answer.png files
while IFS= read -r file; do
  dir=$(dirname "$file")
  qid=$(basename "$dir")
  cp "$file" "$DST/answer/${qid}.png"
  echo "  answer   → ${qid}.png"
  ((answer_count++)) || true
done < <(find "$SRC" -name "classic-answer.png" -type f | sort)

echo ""
echo "Done! $question_count questions, $answer_count answers copied to $DST/"

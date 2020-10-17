#!/bin/bash
set -xe

rm -rf public
rm -rf lesson.json
mkdir -p public.tmp

for lesson in `ls lessons/*.json`; do
    # echo $lesson
    lesson_path=$(basename -- "$lesson")
    lesson_path="${lesson_path%.*}"

    cp $lesson lesson.json
    yarn clean && yarn build

    rm -rf lesson.json
    mv public "public.tmp/${lesson_path}"
done

mv public.tmp public

import re
import json
import pandas as pd
from tqdm import tqdm

LESSON_BASE = {
    "id": "",
    "title": "",
    "url": "https://finlit.finmango.org/",
    "text": "",
    "media": "static/cover.jpg",
    "poster": "static/cover.jpg",
    "chapters": [],
}

BLURB_DEFAULT = (
    "Welcome to FinLit lessons by FinMango! In this lesson you will learn about: {title}"
)


def safe_path_str(text: str) -> str:
    return re.sub(r"[^a-z0-9\-]", "", text.lower().replace(" ", "-").replace("&", "and"))


def safe_text_to_html(text: str) -> str:
    text = "</p><p>".join(text.split("\n"))
    return f"<p>{text}</p>".replace("<p></p>", "")


def val_or_default(val: str, default: str = "") -> str:
    return "" if pd.isna(val) else str(val).strip()


if __name__ == "__main__":
    sheets = pd.read_excel(
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQSW-rByFopHCDLLr5aVoU4PGNQNVtVJQBZxVaV1CbF6Oqd-PsyTjrF24xkurFBL7JNhVdDXP2vR8s2/pub?output=xlsx",
        sheet_name=None,
    )
    for df in tqdm(list(sheets.values())):
        df = df.dropna(subset=["Topic Title"])
        if len(df) == 0:
            continue

        title_col_idx = list(df.columns).index("Title 1")
        for _, row in df.iterrows():
            lesson_title = row["Topic Title"].strip()
            lesson_id = safe_path_str(lesson_title)
            lesson_url = f"https://finlit.finmango.org/{lesson_id}/"
            lesson = dict(
                LESSON_BASE, id=lesson_id, title=lesson_title, url=lesson_url, chapters=[]
            )
            fallback_title = BLURB_DEFAULT.format(title=lesson_title)
            lesson["text"] = val_or_default(row["Topic Blurb"], default=fallback_title)
            lesson["media"] = val_or_default(row["Topic Image"], default="static/cover.jpg")
            lesson["poster"] = lesson["media"]
            for idx in range(title_col_idx, len(df.columns), 3):
                if pd.isna(row.iloc[idx]) or df.columns[idx].startswith("Question"):
                    continue
                section_title = row.iloc[idx].strip()
                section_id = safe_path_str(section_title)
                section_media = val_or_default(row.iloc[idx + 2]) or "static/background.jpg"
                lesson["chapters"].append(
                    {
                        "id": "id-" + safe_path_str(section_title),
                        "title": section_title,
                        "text": safe_text_to_html(val_or_default(row.iloc[idx + 1])),
                        "media": section_media,
                        "template": "page-fill-vertical",
                    }
                )

            with open(f"lessons/{lesson_id}.json", "w") as fh:
                json.dump(lesson, fh, indent="\t")


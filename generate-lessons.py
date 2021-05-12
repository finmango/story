import json
import pandas as pd

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
    return text.lower().replace(" ", "-").replace(".", "").replace("&", "and")


def safe_text_to_html(text: str) -> str:
    text = "</p><p>".join(text.split("\n"))
    return f"<p>{text}</p>".replace("<p></p>", "")


def val_or_default(val: str, default: str = "") -> str:
    return "" if pd.isna(val) else str(val).strip()


if __name__ == "__main__":
    df = pd.read_csv("content.csv")

    title_col_idx = list(df.columns).index("Title 1")
    for _, row in df.iterrows():
        lesson_title = row["Topic Title"].strip()
        lesson_id = safe_path_str(lesson_title)
        lesson_url = f"https://finlit.finmango.org/{lesson_id}/"
        lesson = dict(LESSON_BASE, id=lesson_id, title=lesson_title, url=lesson_url, chapters=[])
        lesson["text"] = val_or_default(
            row["Topic Blurb"], default=BLURB_DEFAULT.format(title=lesson_title)
        )
        for idx in range(title_col_idx, len(df.columns), 3):
            if pd.isna(row.iloc[idx]):
                continue
            section_title = row.iloc[idx].split("(")[0].strip()
            section_id = safe_path_str(section_title)
            section_media = val_or_default(row.iloc[idx + 2]) or "static/background.jpg"
            lesson["chapters"].append(
                {
                    "id": safe_path_str(section_title),
                    "title": section_title,
                    "text": safe_text_to_html(val_or_default(row.iloc[idx + 1])),
                    "media": section_media,
                    "template": "page-fill-vertical",
                }
            )

        with open(f"lessons/{lesson_id}.json", "w") as fh:
            json.dump(lesson, fh, indent="\t")


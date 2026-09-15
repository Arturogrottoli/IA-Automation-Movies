"""
Perfil de gusto: que combinacion de genero/decada/director/duracion predice
que una pelicula se vuelva a ver (revisiones como senal de "le gusto de
verdad", nadie revisita algo que no le gusto).

Corre offline (no toca Make). Lee el catalogo publicado + posters.json +
actors.json + runtime.json, y escribe ../taste_profile.json para el sitio.

  python cerebro/taste_profile.py
"""
import json
import re
import unicodedata
import urllib.request
from collections import Counter, defaultdict

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MultiLabelBinarizer

ROOT = __file__.rsplit("cerebro", 1)[0]
SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQix1DRbjfgI7Cm-2-52QLMrGrTaDt_B5tHsGd8QV6wqb_jJfduRa1q1kVezcrz0okXo-gtVybYe3zX/pub?gid=1860980534&single=true&output=csv"


def norm(s):
    s = (s or "").strip()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def poster_key(title, year):
    return f"{norm(title)}|{year}"


def load_json(name):
    with open(ROOT + name, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    csv_text = urllib.request.urlopen(SHEET_CSV_URL).read().decode("utf-8")
    df = pd.read_csv(pd.io.common.StringIO(csv_text))

    posters = load_json("posters.json")
    actors = load_json("actors.json")
    runtime = load_json("runtime.json")

    df["anio_estreno"] = pd.to_numeric(df["anio_estreno"], errors="coerce")
    df = df.dropna(subset=["titulo", "anio_estreno"])
    df["key"] = df.apply(lambda r: poster_key(r["titulo"], int(r["anio_estreno"])), axis=1)
    df["decada"] = (df["anio_estreno"] // 10 * 10).astype(int)

    # revisiones: cuantas filas comparten titulo+anio (ya viene asi en la hoja,
    # una fila por visionado)
    counts = df.groupby("key")["key"].transform("count")
    df["revisiones"] = counts
    df["es_revisitada"] = df["revisiones"] > 1

    # una fila por pelicula unica (no por visionado) para el analisis
    uniq = df.drop_duplicates(subset="key").copy()
    uniq["generos"] = uniq["key"].map(lambda k: (posters.get(k) or {}).get("genres") or [])
    uniq["rating"] = uniq["key"].map(lambda k: (posters.get(k) or {}).get("rating"))
    uniq["reparto"] = uniq["key"].map(lambda k: actors.get(k) or [])
    uniq["duracion"] = uniq["key"].map(lambda k: runtime.get(k))

    print(f"peliculas unicas: {len(uniq)} | revisitadas: {int(uniq['es_revisitada'].sum())}")

    # --- 1. tasa de revision por genero (con genero identificado) ---
    con_genero = uniq[uniq["generos"].map(len) > 0]
    genre_rows = []
    for _, r in con_genero.iterrows():
        for g in r["generos"]:
            genre_rows.append({"genero": g, "revisitada": r["es_revisitada"]})
    genre_df = pd.DataFrame(genre_rows)
    genre_rate = (
        genre_df.groupby("genero")["revisitada"]
        .agg(["mean", "count"])
        .query("count >= 15")
        .sort_values("mean", ascending=False)
    )
    print("\n--- tasa de revision por genero (min 15 peliculas) ---")
    print(genre_rate.assign(**{"mean": (genre_rate["mean"] * 100).round(1)}))

    # --- 2. tasa de revision por decada ---
    dec_rate = (
        uniq.groupby("decada")["es_revisitada"]
        .agg(["mean", "count"])
        .query("count >= 10")
        .sort_values("mean", ascending=False)
    )
    print("\n--- tasa de revision por decada (min 10 peliculas) ---")
    print(dec_rate.assign(**{"mean": (dec_rate["mean"] * 100).round(1)}))

    # --- 3. tasa de revision por director (con >= 4 peliculas) ---
    dir_rows = []
    for _, r in uniq.iterrows():
        d = str(r.get("director") or "")
        for name in re.split(r",| y |/|&", d):
            name = name.strip()
            if name:
                dir_rows.append({"director": name, "revisitada": r["es_revisitada"]})
    dir_df = pd.DataFrame(dir_rows)
    dir_rate = (
        dir_df.groupby("director")["revisitada"]
        .agg(["mean", "count"])
        .query("count >= 4")
        .sort_values("mean", ascending=False)
    )
    print("\n--- tasa de revision por director (min 4 peliculas) ---")
    print(dir_rate.assign(**{"mean": (dir_rate["mean"] * 100).round(1)}).head(15))

    # --- 4. duracion: promedio de las revisitadas vs las no ---
    con_dur = uniq.dropna(subset=["duracion"])
    print("\n--- duracion promedio ---")
    print(con_dur.groupby("es_revisitada")["duracion"].mean().round(1))

    # --- 5. modelo chico: que tan bien predicen genero+decada+pais si se revisita ---
    model_df = con_genero.copy()
    mlb = MultiLabelBinarizer()
    genre_matrix = mlb.fit_transform(model_df["generos"])
    genre_cols = [f"g_{g}" for g in mlb.classes_]
    X = pd.DataFrame(genre_matrix, columns=genre_cols, index=model_df.index)
    X["decada"] = model_df["decada"]
    X["duracion"] = model_df["duracion"].fillna(model_df["duracion"].median())
    y = model_df["es_revisitada"]

    clf = RandomForestClassifier(n_estimators=200, max_depth=5, random_state=42, class_weight="balanced")
    clf.fit(X, y)
    importances = pd.Series(clf.feature_importances_, index=X.columns).sort_values(ascending=False)
    print("\n--- que tanto pesa cada variable para predecir revision (random forest) ---")
    print(importances.head(12).round(3))

    # --- guardar resumen para el sitio ---
    out = {
        "top_generos": [
            {"genero": g, "tasa": round(row["mean"] * 100, 1), "n": int(row["count"])}
            for g, row in genre_rate.head(5).iterrows()
        ],
        "top_decadas": [
            {"decada": int(d), "tasa": round(row["mean"] * 100, 1), "n": int(row["count"])}
            for d, row in dec_rate.head(5).iterrows()
        ],
        "top_directores": [
            {"director": d, "tasa": round(row["mean"] * 100, 1), "n": int(row["count"])}
            for d, row in dir_rate.head(8).iterrows()
        ],
        "duracion_revisitadas": round(con_dur[con_dur["es_revisitada"]]["duracion"].mean(), 1),
        "duracion_no_revisitadas": round(con_dur[~con_dur["es_revisitada"]]["duracion"].mean(), 1),
        "variables_mas_importantes": [
            {"variable": v.replace("g_", ""), "peso": round(float(w), 3)}
            for v, w in importances.head(8).items()
        ],
    }
    with open(ROOT + "taste_profile.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("\nGuardado en taste_profile.json")


if __name__ == "__main__":
    main()

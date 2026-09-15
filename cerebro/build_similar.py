"""
Recomendador por similitud de contenido: para cada pelicula, las 5 mas
parecidas segun genero, director, reparto y decada (ponderado - director y
actores pesan mas que genero, que pesa mas que decada).

Corre offline (no toca Make). Escribe ../similar.json:
  { "titulo_norm|anio": [{"t","y","d"}, ...5], ... }

  python cerebro/taste_profile.py   (si no corrio antes, para tener el csv en cache no hace falta)
  python cerebro/build_similar.py
"""
import json
import re
import unicodedata
import urllib.request

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
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
    df["anio_estreno"] = pd.to_numeric(df["anio_estreno"], errors="coerce")
    df = df.dropna(subset=["titulo", "anio_estreno"])
    df["key"] = df.apply(lambda r: poster_key(r["titulo"], int(r["anio_estreno"])), axis=1)
    df["decada"] = (df["anio_estreno"] // 10 * 10).astype(int)
    uniq = df.drop_duplicates(subset="key").reset_index(drop=True)

    posters = load_json("posters.json")
    actors = load_json("actors.json")

    uniq["generos"] = uniq["key"].map(lambda k: (posters.get(k) or {}).get("genres") or [])
    uniq["reparto"] = uniq["key"].map(lambda k: actors.get(k) or [])
    uniq["director_norm"] = uniq["director"].fillna("").map(lambda d: norm(str(d).split(",")[0].split("/")[0].strip()))

    print(f"peliculas unicas: {len(uniq)}")

    mlb_g = MultiLabelBinarizer()
    G = mlb_g.fit_transform(uniq["generos"]) * 1.0  # peso 1

    mlb_a = MultiLabelBinarizer()
    A_raw = mlb_a.fit_transform(uniq["reparto"])
    # solo actores que aparecen en 2+ peliculas del catalogo (si no, no aportan señal)
    keep = A_raw.sum(axis=0) >= 2
    A = A_raw[:, keep] * 2.0  # peso 2

    dir_dummies = pd.get_dummies(uniq["director_norm"].where(uniq["director_norm"] != "", None))
    D = dir_dummies.values * 3.0  # peso 3 (la señal mas fuerte, ver perfil de gusto)

    dec_dummies = pd.get_dummies(uniq["decada"])
    DEC = dec_dummies.values * 0.5  # peso chico

    X = np.hstack([G, A, D, DEC])
    sim = cosine_similarity(X)
    np.fill_diagonal(sim, -1)  # no recomendarse a si misma

    out = {}
    for i, row in uniq.iterrows():
        top_idx = np.argsort(-sim[i])[:5]
        top_idx = [j for j in top_idx if sim[i, j] > 0][:5]
        out[row["key"]] = [
            {"t": uniq.loc[j, "titulo"], "y": int(uniq.loc[j, "anio_estreno"]), "d": uniq.loc[j, "director"]}
            for j in top_idx
        ]

    with open(ROOT + "similar.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    # ejemplo para revisar a ojo
    for title in ["whiplash|2014", "john wick|2014", "the godfather|1972"]:
        if title in out:
            print(f"\n--- parecidas a {title} ---")
            for m in out[title]:
                print(" -", m["t"], m["y"], "·", m["d"])

    print(f"\nGuardado en similar.json ({len(out)} peliculas)")


if __name__ == "__main__":
    main()

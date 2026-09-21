"""
Segundo metodo de recomendacion, para comparar contra build_similar.py:
en vez de pesos fijos (director x3, reparto x2, genero x1, decada x0.5),
repondera cada bloque con senales reales de taste_profile.json:

  - director: en vez de peso fijo, escala por (1 + tasa_revision_ese_director/100)
    -- directores que el usuario revisita mas, pesan mas en la similitud.
  - genero: escala cada genero por su tasa de revision real (genre_rate_full).
  - decada: escala por el peso que le dio el Random Forest a "decada"
    (variables_mas_importantes), no un 0.5 fijo.
  - duracion: el metodo por contenido NO usa duracion. Se suma como feature
    nueva, escalada por el peso RF de "duracion" (el mas alto de todos) --
    es la forma concreta de que este metodo "ajustado" honre el hallazgo
    central del perfil de gusto (Placa VII).

Requiere haber corrido taste_profile.py antes (lee taste_profile.json).
Escribe ../similar_ajustado.json, mismo shape que similar.json:
  { "titulo_norm|anio": [{"t","y","d"}, ...5], ... }

  python cerebro/taste_profile.py
  python cerebro/build_similar_ajustado.py
"""
import json
import re
import unicodedata
import urllib.request

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

ROOT = __file__.rsplit("cerebro", 1)[0]
SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQix1DRbjfgI7Cm-2-52QLMrGrTaDt_B5tHsGd8QV6wqb_jJfduRa1q1kVezcrz0okXo-gtVybYe3zX/pub?gid=1860980534&single=true&output=csv"
POR_VER_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQix1DRbjfgI7Cm-2-52QLMrGrTaDt_B5tHsGd8QV6wqb_jJfduRa1q1kVezcrz0okXo-gtVybYe3zX/pub?gid=1297033198&single=true&output=csv"


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
    taste = load_json("taste_profile.json")
    genre_tasa = {r["genero"]: r["tasa"] / 100 for r in taste["genre_rate_full"]}
    dir_tasa_norm = {norm(r["director"]): r["tasa"] / 100 for r in taste["dir_rate_full"]}
    pesos_rf = {v["variable"]: v["peso"] for v in taste["variables_mas_importantes"]}
    peso_decada = pesos_rf.get("decada", 0.15)
    peso_duracion = pesos_rf.get("duracion", 0.25)

    csv_text = urllib.request.urlopen(SHEET_CSV_URL).read().decode("utf-8")
    df = pd.read_csv(pd.io.common.StringIO(csv_text))[["titulo", "director", "anio_estreno"]]
    pv_text = urllib.request.urlopen(POR_VER_CSV_URL).read().decode("utf-8")
    pv = pd.read_csv(pd.io.common.StringIO(pv_text))[["titulo", "director", "anio_estreno"]]

    df = pd.concat([df, pv], ignore_index=True)
    df["anio_estreno"] = pd.to_numeric(df["anio_estreno"], errors="coerce")
    df = df.dropna(subset=["titulo", "anio_estreno"])
    df["key"] = df.apply(lambda r: poster_key(r["titulo"], int(r["anio_estreno"])), axis=1)
    df["decada"] = (df["anio_estreno"] // 10 * 10).astype(int)
    uniq = df.drop_duplicates(subset="key").reset_index(drop=True)

    posters = load_json("posters.json")
    actors = load_json("actors.json")
    runtime = load_json("runtime.json")

    uniq["generos"] = uniq["key"].map(lambda k: (posters.get(k) or {}).get("genres") or [])
    uniq["reparto"] = uniq["key"].map(lambda k: actors.get(k) or [])
    uniq["director_norm"] = uniq["director"].fillna("").map(lambda d: norm(str(d).split(",")[0].split("/")[0].strip()))
    uniq["duracion"] = uniq["key"].map(lambda k: runtime.get(k))

    print(f"peliculas unicas: {len(uniq)}")

    # genero: en vez de dummy fija (peso 1), cada columna escalada por su tasa de revision real
    all_genres = sorted({g for gs in uniq["generos"] for g in gs})
    G = np.zeros((len(uniq), len(all_genres)))
    for i, gs in enumerate(uniq["generos"]):
        for g in gs:
            G[i, all_genres.index(g)] = genre_tasa.get(g, 0.05)  # genero sin dato: peso chico neutro

    # reparto: mismo criterio que build_similar.py (solo actores en 2+ peliculas), peso fijo 2
    all_actors = sorted({a for rs in uniq["reparto"] for a in rs})
    A_raw = np.zeros((len(uniq), len(all_actors)))
    for i, rs in enumerate(uniq["reparto"]):
        for a in rs:
            A_raw[i, all_actors.index(a)] = 1
    keep = A_raw.sum(axis=0) >= 2
    A = A_raw[:, keep] * 2.0

    # director: dummy escalada por (1 + tasa_revision_ese_director)
    all_dirs = sorted({d for d in uniq["director_norm"] if d})
    D = np.zeros((len(uniq), len(all_dirs)))
    for i, d in enumerate(uniq["director_norm"]):
        if d:
            boost = 1 + dir_tasa_norm.get(d, 0.0)  # sin dato (< 4 peliculas): sin boost
            D[i, all_dirs.index(d)] = boost

    # decada: dummy escalada por el peso RF de "decada" (no el 0.5 fijo de build_similar.py)
    all_decadas = sorted(uniq["decada"].unique())
    DEC = np.zeros((len(uniq), len(all_decadas)))
    for i, dec in enumerate(uniq["decada"]):
        DEC[i, all_decadas.index(dec)] = peso_decada

    # duracion: feature nueva que el metodo por contenido no usa, normalizada 0-1 y escalada por su peso RF
    dur = uniq["duracion"].fillna(uniq["duracion"].median()).to_numpy().reshape(-1, 1)
    dur_norm = (dur - dur.min()) / (dur.max() - dur.min() + 1e-9)
    DUR = dur_norm * peso_duracion

    X = np.hstack([G, A, D, DEC, DUR])
    sim = cosine_similarity(X)
    np.fill_diagonal(sim, -1)

    out = {}
    for i, row in uniq.iterrows():
        top_idx = np.argsort(-sim[i])[:5]
        top_idx = [j for j in top_idx if sim[i, j] > 0][:5]
        out[row["key"]] = [
            {"t": uniq.loc[j, "titulo"], "y": int(uniq.loc[j, "anio_estreno"]), "d": uniq.loc[j, "director"]}
            for j in top_idx
        ]

    with open(ROOT + "similar_ajustado.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    for title in ["whiplash|2014", "john wick|2014", "the godfather|1972"]:
        if title in out:
            print(f"\n--- parecidas (ajustado) a {title} ---")
            for m in out[title]:
                print(" -", m["t"], m["y"], "·", m["d"])

    print(f"\nGuardado en similar_ajustado.json ({len(out)} peliculas)")


if __name__ == "__main__":
    main()

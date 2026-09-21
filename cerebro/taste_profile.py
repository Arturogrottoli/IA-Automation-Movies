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
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MultiLabelBinarizer, StandardScaler

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

    # --- 4. duracion: promedio de las revisitadas vs las no, y por rangos ---
    con_dur = uniq.dropna(subset=["duracion"])
    print("\n--- duracion promedio ---")
    print(con_dur.groupby("es_revisitada")["duracion"].mean().round(1))

    bins = [0, 80, 95, 110, 125, 140, 160, 2000]
    labels = ["<80", "80-95", "95-110", "110-125", "125-140", "140-160", "160+"]
    con_dur = con_dur.copy()
    con_dur["bucket"] = pd.cut(con_dur["duracion"], bins=bins, labels=labels)
    dur_bucket = con_dur.groupby("bucket", observed=True)["es_revisitada"].agg(["mean", "count"])
    print("\n--- tasa de revision por rango de duracion ---")
    print(dur_bucket.assign(**{"mean": (dur_bucket["mean"] * 100).round(1)}))
    # el salto en 160+ min es casi todo Scorsese/Tarantino: la duracion es
    # un proxy del director, no la causa real
    long_rewatched = uniq[(uniq["duracion"] >= 160) & (uniq["es_revisitada"])]

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

    # --- 6. combos director+actor (con >= 2 peliculas juntos) ---
    combo_rows = []
    for _, r in uniq.iterrows():
        d = str(r.get("director") or "")
        dirs = [n.strip() for n in re.split(r",| y |/|&", d) if n.strip()]
        for dn in dirs:
            for an in r["reparto"]:
                combo_rows.append({"director": dn, "actor": an, "revisitada": r["es_revisitada"]})
    combo_df = pd.DataFrame(combo_rows)
    combo_rate = (
        combo_df.groupby(["director", "actor"])["revisitada"]
        .agg(["mean", "count"])
        .query("count >= 2")
        .sort_values("mean", ascending=False)
    )
    print("\n--- tasa de revision por combo director+actor (min 2 peliculas juntos) ---")
    print(combo_rate.assign(**{"mean": (combo_rate["mean"] * 100).round(1)}).head(10))

    # --- 7. clustering: "familias de gusto" por anio visto ---
    df["duracion"] = df["key"].map(lambda k: runtime.get(k))
    df["generos"] = df["key"].map(lambda k: (posters.get(k) or {}).get("genres") or [])
    top_generos_global = genre_df["genero"].value_counts().head(5).index.tolist()

    anios = sorted(df["anio_visto"].dropna().unique())
    feat_rows = []
    for a in anios:
        sub = df[df["anio_visto"] == a]
        row = {
            "anio": int(a),
            "decada_prom": sub["decada"].mean(),
            "duracion_prom": sub["duracion"].mean(),
            "tasa_revision": sub["es_revisitada"].mean() * 100,
        }
        for g in top_generos_global:
            row[f"pct_{g}"] = sub["generos"].map(lambda gs: g in gs).mean()
        feat_rows.append(row)
    feat_df = pd.DataFrame(feat_rows).fillna(0)
    feat_cols = [c for c in feat_df.columns if c != "anio"]
    X_years = StandardScaler().fit_transform(feat_df[feat_cols])

    n_clusters = min(3, len(anios))
    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    feat_df["cluster"] = km.fit_predict(X_years)
    print(f"\n--- clustering de {len(anios)} anios en {n_clusters} familias de gusto ---")
    print(feat_df[["anio", "decada_prom", "duracion_prom", "tasa_revision", "cluster"]].round(1))

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
        "tasa_por_duracion": [
            {"rango": b, "tasa": round(row["mean"] * 100, 1), "n": int(row["count"])}
            for b, row in dur_bucket.iterrows()
        ],
        "nota_duracion": (
            "El salto en peliculas de 160+ min es casi todo Scorsese y "
            "Tarantino: la duracion es un proxy del director, no la causa."
        ),
        "variables_mas_importantes": [
            {"variable": v.replace("g_", ""), "peso": round(float(w), 3)}
            for v, w in importances.head(8).items()
        ],
        "genre_rate_full": [
            {"genero": g, "tasa": round(row["mean"] * 100, 1), "n": int(row["count"])}
            for g, row in genre_rate.iterrows()
        ],
        "dir_rate_full": [
            {"director": d, "tasa": round(row["mean"] * 100, 1), "n": int(row["count"])}
            for d, row in dir_rate.iterrows()
        ],
        "top_combos": [
            {"director": d, "actor": a, "tasa": round(row["mean"] * 100, 1), "n": int(row["count"])}
            for (d, a), row in combo_rate.head(5).iterrows()
        ],
        "clusters_anio": [
            {"anio": int(r["anio"]), "cluster": int(r["cluster"])} for _, r in feat_df.iterrows()
        ],
        "cluster_resumen": [
            {
                "cluster": int(c),
                "anios": sorted(int(a) for a in feat_df[feat_df["cluster"] == c]["anio"]),
                "decada_prom": round(float(feat_df[feat_df["cluster"] == c]["decada_prom"].mean()), 0),
                "duracion_prom": round(float(feat_df[feat_df["cluster"] == c]["duracion_prom"].mean()), 1),
                "tasa_revision_prom": round(float(feat_df[feat_df["cluster"] == c]["tasa_revision"].mean()), 1),
            }
            for c in sorted(feat_df["cluster"].unique())
        ],
    }
    with open(ROOT + "taste_profile.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("\nGuardado en taste_profile.json")


if __name__ == "__main__":
    main()

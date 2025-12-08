# 📺 Infoskjerm – Kantine / Arbeidsplass

En moderne infoskjerm-løsning for kantiner, arbeidsplasser og situasjonssentre.

## Funksjoner

- 📰 **Automatisk oppdaterte nyheter (RSS):**
- 🛫 **Innenriks:** fra NRK
- 🌍 **Utenriks:** fallback mellom Sky News / BBC / CNN
- 🏢 **Interne meldinger:** via eget adminpanel
- ☀️ **Vær:** nåværende og 7-dagers varsel (default: Bodø, kan overstyres)
- 🔄 **Automatisk seksjons-rotasjon**
- 🕒 **Live klokke og dato**
- 📊 **Progressbar:** for neste seksjonsbytte
- 🔑 **Basic Auth-beskyttet administrasjon**

## Kan kjøres

- Lokalt (uten Docker)
- I Docker
- Eller i valgfri cloud-tjeneste

## 📂 Prosjektstruktur

```
Infoscreen/
├─ backend/
│  ├─ api/
│  │  ├─ rss/
│  │  │  ├─ innenriks.py
│  │  │  ├─ utenriks.py
│  │  ├─ internal/
│  │     ├─ hva_skjer.py
│  ├─ auth.py
│  ├─ db.py
│  ├─ models.py
│  ├─ main.py
│
├─ frontend/
│  ├─ index.html
│  ├─ admin.html
│  ├─ screen.js
│  ├─ admin.js
│  ├─ styles.css
│
├─ requirements.txt
├─ .env.example
├─ Dockerfile
└─ README.md
```

## ⚙️ Miljøvariabler

Alle hemmeligheter/konfigurasjon settes i `.env` (denne **SKAL ikke** committes).

Eksempel: `.env.example` følger med repoet.

```env
# Eksempel på konfigurasjon for Infoscreen

# Database-URL
DATABASE_URL=sqlite:///./infoscreen.db

# Admin login
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme

# (Optional) Weather position (default: Bodø)
# WEATHER_LAT=67.2804
# WEATHER_LON=14.4049
```

**Lag din egen .env:**
```sh
cp .env.example .env
```
Endre deretter verdiene til noe mer sikkert.

---

## 🛠 Kjøre lokalt (uten Docker)

Perfekt for utvikling.

1. Opprett virtualenv og installer avhengigheter:

    ```sh
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

2. Start serveren:

    ```sh
    uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
    ```

3. Åpne infoskjermen:

    👉 [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

4. Adminpanel:

    👉 [http://127.0.0.1:8000/admin.html](http://127.0.0.1:8000/admin.html)

> Autentiseres med Basic Auth.

---

## 🐳 Kjøre via Docker (anbefalt for produksjon)

1. Bygg container:

    ```sh
    docker build -t infoscreen .
    ```

2. Kjør container:

    ```sh
    docker run -p 8000:8000 \
      -e ADMIN_USERNAME=admin \
      -e ADMIN_PASSWORD=superhemmelig \
      -e DATABASE_URL=sqlite:///./infoscreen.db \
      infoscreen
    ```

3. Åpne appen:

    👉 [http://localhost:8000](http://localhost:8000)
    👉 [http://localhost:8000/admin.html](http://localhost:8000/admin.html)

---

## 🗄 Database

- Standard: **SQLite** (automatisk opprettet ved oppstart).
- Kan også bruke **PostgreSQL** eller andre SQLAlchemy-støttede databaser.

Bytt database via `.env`:

```env
DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/infoscreen
```

---

## 📰 Datastrømmer

- **Innenriks:** hentes fra NRK sin RSS-feed.
- **Utenriks (fallback):** Sky News World, BBC World, CNN World.
  - Første tilgjengelige brukes.
- **Hva skjer på jobb (lokalt innhold):**
  - Lagres i SQLite (eller ekstern DB)
  - Administreres via admin-panelet

---

## 🔐 Adminpanel

**URL:**
👉 `http://<server>/admin.html`  
Beskyttet med Basic Auth.

### Funksjoner

- Legg til intern melding
- Rediger eksisterende
- Slett melding
- Meldinger vises automatisk på infoskjermen ved neste rotasjon

---

## 🔄 Autosystem

- **Visning:**
  - “Hva skjer på jobb”
  - “Innenriks”
  - “Utenriks”
- **Rotasjon:** Seksjon skifter automatisk hvert 15. sekund
- **Fremdrift:** Indikert med progressbar nederst på skjermen
- **Oppdatering av data:**
  - Innenriks: hvert 10. minutt
  - Utenriks: hvert 10. minutt
  - Hva skjer: hentes hver gang seksjonen vises
  - Siden refresher automatisk hver time (kan justeres)

---

## 🚀 Deploying i cloud

Fungerer "rett ut av boksen" på:

- Railway.app
- Fly.io
- Render
- DigitalOcean Apps
- Docker Swarm
- AWS Lightsail / ECS
- Azure Web App
- GCP Cloud Run

Typisk steg-for-steg:

```sh
docker build -t registry/infoscreen .
docker push registry/infoscreen
```

Deretter deploy i valgfri container-host.

---

## 📦 Fremtidige forbedringer

- WebSocket-basert liveoppdatering
- Støtte for bilder i meldinger
- Flere RSS-kilder
- Dark/light mode
- Mulighet for fullskjerm-video / bildekarusell
- Integrasjon mot kalender (Exchange/Google)

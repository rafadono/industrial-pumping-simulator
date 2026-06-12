# Industrial Pumping Simulation & Validation Suite - Slurry & Water

A professional, advanced engineering tool for hydraulic design, calculation, and validation of fluid transportation systems carrying homogeneous liquids and heavy, highly abrasive mineral slurries. This suite implements the standard technical criteria, corporate specifications, and empirical equations used in large-scale mining projects, dynamically modeling complex scenarios such as the variable pressure cycle of filter press feeding.

The application is built on a highly performant, decoupled architecture:
1. **Scientific Calculation Engine**: Built with **FastAPI** (Python), acting as the single mathematical source of truth.
2. **Interactive UI**: A Single Page Application (SPA) structured with **Tailwind CSS** and managed with **Vanilla JavaScript** (ES6 modules).

---

## Engineering Features & Corrected Formulations

### 1. Unified Hydraulic Engine (Domain Layer)
All logic regarding friction loss, energy balance, transient shockwaves, and rheology runs on the Python backend. The frontend acts purely as a clean presentation layer, consuming the JSON API. This prevents dual-maintenance and calculation discrepancies between client-side and server-side logic.

### 2. Corrected Physical Equations
This suite implements strict physical models corrected from common industrial simplified errors:
* **Durand Critical Deposition Velocity ($V_L$)**: Corrected to use the **solids specific gravity ($S_s$)** rather than the mixture specific gravity ($S_m$). The standard formulation is:
  $$V_L = 1.25 \cdot F_L \sqrt{2gD(S_s - 1)}$$
  Using $S_m$ instead of $S_s$ underestimates the deposition velocity, risking sediment clogging. The context provides both variables (`Ss` and `Sm`) to support legacy user formulas.
* **Korteweg & Joukowsky Wave Celerity ($a$)**: Corrected to dynamically utilize the **mixture operating density ($\rho_m$)** instead of a hardcoded value of $1750$ kg/m³:
  $$a = \frac{\sqrt{K / \rho_m}}{\sqrt{1 + \frac{K}{E} \frac{D}{e}}}$$
  This allows accurate calculations across different media, such as process water ($\rho \approx 1000$ kg/m³) or thick slurries.

### 3. Dynamic Filter Press Pressure Cycle Simulation
Instead of a single static operating point, the suite accepts both initial filter pressure (empty filter) and final filter pressure (full cake). The engine processes both resistance parabolas in parallel, allowing engineers to visualize the full operating spectrum on a Chart.js multi-axis chart.

### 4. Dynamic Equation Compiling (Hot-Compiling)
Through the "Custom Formulas" panel, engineers can modify mathematical models inside the scientific core at runtime. The script loads default templates (e.g., Haaland turbulent friction, Thomas slurry viscosity, Korteweg wave speed, and Cave solids de-rating) and compiles user-defined Javascript expressions, keeping them persisted in `localStorage`.

---

## Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions workflow running automated pytest suites
├── src/
│   ├── pump_model.py           # Domain model classes (Fluid, Pipe, PumpingSystem)
│   └── server.py               # FastAPI REST endpoint and static file mounting
├── tests/
│   └── test_pump.py            # Unit and integration tests (Pytest)
├── frontend/
│   ├── index.html              # Core single-page layout (50/50 responsive splits)
│   ├── css/
│   │   └── styles.css          # Customized visual rules & PDF print layouts
│   └── js/
│       ├── app.js              # Central orchestration and API communications
│       ├── services/
│       │   ├── languages.js    # Bilingual i18n translation maps (ES / EN)
│       │   ├── presets.js      # Base mining preset variables database
│       │   └── templates.js    # Base mathematical formula templates
│       └── ui/
│           ├── dom.js          # Form state, validation, storage and event management
│           ├── render.js       # KPI bindings, cavitation alerts, and diameter warnings
│           └── charts.js       # Chart.js rendering on a linear flow scale
├── Dockerfile                  # Slim Python deployment container recipe
├── docker-compose.yml          # Services orchestrator for local development and testing
├── pyproject.toml              # Global dependencies configuration file (uv compatible)
└── .dockerignore               # Docker build exclusions file
```

---

## Local Setup & Development Guidelines

### Prerequisites
- Python 3.11+
- pip (or **uv** for faster setups)
- Docker (optional)

### Running Locally (Python & Frontend)
1. Install dependencies:
   ```bash
   pip install .
   ```
2. Start the FastAPI server:
   ```bash
   uvicorn src.server:app --reload
   ```
3. Open `http://localhost:8000` in your browser.

### Running Tests
Execute the test suite with pytest:
```bash
python -m pytest tests/test_pump.py -v
```

### Running with Docker Compose
- Start the simulation API:
  ```bash
  docker-compose up
  ```
- Run the test suite:
  ```bash
  docker-compose run pump_test
  ```
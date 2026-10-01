# Untitled

# 3D Geometry Solver V0.1

An interactive 3D geometry solver designed to make spatial mathematics easier to explore and calculate.

The project combines a customizable user interface with mathematical calculation engines, providing tools for working with points, vectors, lines, planes, distances, angles, and geometric areas.

It is available in **two independent versions**: a JavaScript-only version and a Python-powered version with a web frontend.

## ✨ Features

### 📐 3D Geometry Calculations

The current version includes tools for:

- **Vectors:** dot product, cross product, magnitude, unit vectors, direction cosines, projections, and angles.
- **Points:** distances, midpoints, and point-related calculations.
- **Lines:** distances, projections, angles, and relative positions.
- **Planes:** point-to-plane distances, projections, intersections, and relative positions.
- **Areas:** triangle, parallelogram, and quadrilateral calculations.
- **Exact mathematical results:** supports exact-form output for supported calculations, such as expressing square roots in simplified form.

### 🧮 Mathematical Engine

The project is designed around organized, reusable calculation logic.

The Python engine separates mathematical operations from the API layer, making it easier to maintain the code and extend the available calculations.

The JavaScript version implements its own calculations, allowing it to work without a Python backend.

### 🎨 Customizable Interface

The interface includes interactive color controls:

- **Square color button:** changes the background color.
- **Round color button:** changes other interface colors, including the colors used for interface elements and icons.

The interface supports multiple color choices, allowing users to customize its appearance beyond a simple light or dark theme.

### 🌍 Arabic & English

The application supports both Arabic and English throughout the interface.

Users can switch languages while using the application, making the available tools and information accessible in either language.

### 📊 Visual Geometry Diagrams

The interface includes diagrams to help explain geometric concepts and relationships.

The current diagrams are illustrative; they are not dynamically generated from the user's input values.

---

## 🛠️ Available Versions

### 1. JavaScript Version

A standalone version implemented entirely in JavaScript.

**Highlights:**

- Performs calculations using JavaScript.
- Does not require Python or a backend server.
- Requires no additional libraries or installation.
- Runs directly in a modern web browser.
- Supports Arabic and English.
- Includes the interactive interface and color customization.

**How to run:**

Open the JavaScript version's `index.html` file in your browser.

No build step or package installation is required.

### 2. Python Version

A web application with a JavaScript frontend and a Python calculation engine exposed through FastAPI.

**Highlights:**

- A dedicated Python geometry engine.
- FastAPI for handling calculation requests.
- Pydantic for request and response validation.
- SymPy for supported exact mathematical expressions.
- A frontend separated from the mathematical logic.
- Interactive interface with Arabic and English support.

#### Requirements

- Python 3
- FastAPI
- Uvicorn
- Pydantic
- SymPy

The Python dependencies are listed in `backend/requirements.txt`.

#### Installation and Setup

Alternatively, install the dependencies manually:

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate

pip install fastapi uvicorn sympy

uvicorn main:app --reload
```

The backend will run at:

`http://127.0.0.1:8000`

To access the API documentation, open:

`http://127.0.0.1:8000/docs`

#### Running the Frontend

The frontend does not require a build step.

You can open `frontend/index.html` directly or serve the frontend locally:

```bash
cd frontend
python3 -m http.server 5500
```

Then open:

`http://127.0.0.1:5500`

**Note:** The Python version requires the backend to be running for its calculations to work.

---

## 📁 Project Structure

```
3D-Geometry-Solver/
├── setup.sh
├── backend/
│   ├── geometry.py
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

| File | Purpose |
| --- | --- |
| `geometry.py` | Contains the core Python geometry calculations. |
| `main.py` | Exposes the calculation engine through FastAPI. |
| `index.html` | Defines the frontend page structure. |
| `style.css` | Controls layout, colors, typography, and styling. |
| `app.js` | Handles frontend behavior, tools, forms, and results. |

*The JavaScript-only version is independent of the Python backend; its exact file organization may differ from the structure shown above.*

---

## ⚠️ Error Handling

The Python geometry engine defines specific exceptions to handle invalid or mathematically undefined operations.

Current exception types include:

- `GeometryError` — Base exception for geometry-related errors.
- `ZeroVectorError` — Operations involving an invalid zero vector.
- `DegenerateFigureError` — Geometric figures that do not satisfy the required conditions.
- `ParallelLinesError` — Operations that require non-parallel lines.
- `IntersectionError` — Errors involving undefined or unavailable intersections.

These exceptions help separate mathematical errors from the API and frontend layers.

---

## 🎯 Planned Features

The project is intended to grow beyond its current set of geometry tools.

Potential future additions include:

- **3D Solids:** additional geometric calculations for pyramids and other solids.
- **Expanded Area and Volume Tools:** more formulas for common 3D shapes.
- **More Geometric Operations:** additional calculations and relationships between geometric objects.
- **Further Improvements:** expanded mathematical capabilities and refinements to the user experience.

These features are planned and are not necessarily available in V0.1.

---

## 📌 Project Goals

3D Geometry Solver aims to provide a lightweight and extensible tool for 3D geometry while keeping the mathematical logic organized and the interface easy to use.

Maintaining both JavaScript-only and Python-powered versions offers two ways to use the project: a standalone browser application and a version with a dedicated Python calculation engine.

**Version:** V0.1

**Languages:** JavaScript, Python, HTML, CSS

**Backend:** FastAPI

**Mathematical Library:** SymPy

**Interface Languages:** Arabic and English
# Software Requirements Specification (SRS)
## Project: SQLite Balance Query & Slide Storyboard System (Project Code: SBQS-309)

---

### 1. Target Objective

The objective of this project is to build an interactive, high-fidelity slide storyboard presentation utility coupled with a functional live SQLite simulation engine. This software will visually teach, demonstrate, and execute SQLite balance queries, depicting exactly how query planners lookup user balances under different index schemas.

The system must run as a dual-component application:
1. **The SQLite Engine & Query Processor**: A Python-based back-end managing an in-memory or localized SQLite database storing mock financial records with schema enforcement (specifically targeting unique `usr_id` identifiers).
2. **The Storyboard Presentation Engine**: A visual interface displaying a 4-slide storyboard presentation. The storyboard must dynamically query the database, rendering visual highlights, structural bounding boxes (BBoxes) representing UI cards, database state tables, and real-time step-by-step visual feedback of query execution.

---

### 2. Architectural Design & Component Breakdown

```
+---------------------------------------------------------------------------------+
|                                APPLICATION MAIN                                 |
+-------------------------------------------------+-------------------------------+
|         storyboard_engine.py                    |       sqlite_engine.py        |
|  - Controls 1920x1080 Canvas Rendering          |  - DB Initialization & Seeding|
|  - Renders 4 Slide Scenes (Interactive)          |  - Execute Raw Queries        |
|  - Bounding Box Collision & Visual Layout       |  - Return JSON & Plan Metrics |
+-------------------------------------------------+-------------------------------+
                                        |
                                        v
                            [balance_storyboard.db]
```

#### 2.1 Backend SQLite Schema & Execution Engine
The backend database must initialize an SQLite file named `balance_storyboard.db` containing two tightly coupled tables: `users` and `balances`.

##### Table 1: `users`
*   `usr_id` (TEXT, Primary Key, Constraints: strictly alphanumeric, length between 8 to 12 characters, prefixed with `usr_`).
*   `username` (TEXT, Not Null).
*   `tier` (TEXT, Check constraint: `IN ('Standard', 'Premium', 'VIP')`).

##### Table 2: `balances`
*   `balance_id` (INTEGER, Primary Key, Autoincrement).
*   `usr_id` (TEXT, Foreign Key referencing `users(usr_id)`, Unique, Not Null).
*   `ledger_balance` (REAL, Not Null, Constraint: Must be stored to 4 decimal places of accuracy).
*   `available_balance` (REAL, Not Null, Constraint: Must be less than or equal to `ledger_balance`).
*   `currency` (TEXT, Default `'USD'`, Check constraint: `IN ('USD', 'EUR', 'GBP')`).
*   `last_updated` (TIMESTAMP, Default CURRENT_TIMESTAMP).

#### 2.2 Frontend Storyboard Rendering Engine
The front-end must render an interactive slideshow at an exact canvas resolution of **1920x1080 pixels**. Scaling must maintain aspect ratio (letterboxed if required).
The layout is split into two primary regions:
*   **The Storyboard Slide Viewport (Left Panel)**: 60% Width (`[0, 0, 1152, 1080]`).
*   **Interactive Simulation Console (Right Panel)**: 40% Width (`[1152, 0, 1920, 1080]`).

---

### 3. Rigorous Constraint Checklist

#### 3.1 SQLite Structural Constraints (Hardcoded)
*   [ ] Every balance fetch query must execute utilizing `usr_id` as the primary binding parameter.
*   [ ] Queries targeting the `balances` table must be explicitly optimized. An index must be created and verified:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_balances_usr_id ON balances(usr_id);
    ```
*   [ ] Queries must explicitly select desired columns. Use of `SELECT *` is strictly prohibited. The canonical balance retrieval query must be structured as:
    ```sql
    SELECT ledger_balance, available_balance, currency 
    FROM balances 
    WHERE usr_id = ?;
    ```
*   [ ] Simulated latency injection: Every query must run through an artificial step-delay sequence of 250ms to allow the visual UI to transition between query steps (Parsing -> Index Lookup -> Row Fetch -> Result Output).

#### 3.2 UI Design & Exact Color Theme Constraints
The visual rendering engine must adhere to the following strict color hex-code theme. Deviating by even a single hex channel constitutes a layout failure:
*   **Primary Navy Dark (Backgrounds, Headers)**: `#003366`
*   **Secondary Slate Gray (Secondary elements, Borders)**: `#4A5568`
*   **Canvas Soft White (Slide background body)**: `#F5F7FA`
*   **Accent Vibrant Amber (Active highlights, pointers, query path highlights)**: `#FF9900`
*   **Alert Success Green (Validations, matching balances)**: `#28A745`
*   **Text Charcoal (Body text)**: `#1A202C`

#### 3.3 Slide Layout and Coordinate Constraints (1920x1080 Space)
The application must render 4 distinct slides inside the Left Panel (defined by Bounding Box `[x1: 0, y1: 0, x2: 1152, y2: 1080]`).

##### Slide 1: Introduction to Balance Queries
*   **Title BBox**: `[x1: 80, y1: 80, x2: 1072, y2: 180]`
*   **Content Text BBox**: `[x1: 80, y1: 220, x2: 1072, y2: 500]`
*   **Interactive Diagram Box**: `[x1: 150, y1: 550, x2: 1000, y2: 950]` — Displays mock SQLite client and server visual links.

##### Slide 2: Schema Modeling & `usr_id` Constraints
*   **Title BBox**: `[x1: 80, y1: 80, x2: 1072, y2: 180]`
*   **Visual Schema Representation Grid**:
    *   *User Table Card*: `[x1: 100, y1: 250, x2: 500, y2: 850]`
    *   *Balance Table Card*: `[x1: 652, y1: 250, x2: 1052, y2: 850]`
*   **Relationship Link (Line)**: Drawn directly from Center of User Table card to Center of Balance Table card with a dotted pattern, color-coded `#FF9900`.

##### Slide 3: Query Execution & Execution Plan
*   **Title BBox**: `[x1: 80, y1: 80, x2: 1072, y2: 180]`
*   **Query Display Terminal BBox**: `[x1: 100, y1: 240, x2: 1052, y2: 540]`
*   **Execution Step Cards**:
    *   *Step 1 (Parse)*: `[x1: 100, y1: 620, x2: 380, y2: 920]`
    *   *Step 2 (B-Tree Search)*: `[x1: 436, y1: 620, x2: 716, y2: 920]`
    *   *Step 3 (Data Fetch)*: `[x1: 772, y1: 620, x2: 1052, y2: 920]`

##### Slide 4: Real-time Live Balance Console (Interactive Sandbox)
*   **Title BBox**: `[x1: 80, y1: 80, x2: 1072, y2: 180]`
*   **Query Input Text Area**: `[x1: 100, y1: 240, x2: 1052, y2: 440]`
*   **Dynamic Visualizer Output Node (State Output)**: `[x1: 100, y1: 480, x2: 1052, y2: 980]`
    *   Displays current queried `usr_id` details and highlights matching visual rows in the interactive simulation table.

---

### 4. Intentional Open-Ended / TBD Specifications
*To be resolved during the system refinement iteration phase:*

1.  **[TBD-ANIM-01] Slide Transition Effects**: The design requires slide transitions to use an easing curve. However, the exact cubic-bezier curve parameters or duration (milliseconds) for slide transitions are not fully specified. (Defaulting to basic fade transitions until resolved).
2.  **[TBD-SQL-02] Handling Missing Indexes**: If a user runs a manual test query without using the designated index, the exact alert mechanism within the UI is undefined. Should the software highlight the missing index in `#FF9900` or block execution entirely?
3.  **[TBD-FONT-03] Dynamic Font Sizing & OS Fallbacks**: The rendering engine relies on system fonts. The specifications for exact fallback font families in environments without Standard Sans-Serif fonts (e.g. headless Linux servers running rendering tests) are unspecified.

---

### 5. Testing Suite Specifications & Assertions

To guarantee compliance, the system must include an automated integration and rendering test suite (`test_storyboard.py`) using `pytest` and a visual frame grabber or mock assertion library.

#### 5.1 SQLite Engine Assertions
```python
def test_sqlite_schema_integrity():
    # 1. Database file creation check
    assert os.path.exists("balance_storyboard.db") == True
    
    # 2. Key constraints on usr_id
    # Assert primary key in users, and foreign key with unique constraint in balances.
    # Assert failure when inserting invalid usr_id schema (e.g., prefix missing, or length violation).
    
    # 3. Currency limitations
    # Assert SQLite fails with CHECK constraint error when executing:
    # INSERT INTO balances (usr_id, ledger_balance, available_balance, currency) VALUES ('usr_test123', 100.0, 100.0, 'JPY');
```

#### 5.2 Storyboard Layout & Visual Assertions
The test suite must mock a screen render event and verify coordinate containment:
```python
def test_slide_3_layout_bounding_boxes():
    # Load slide 3 config
    slide3 = SlideRegistry.get_slide(3)
    
    # 1. Assert boundaries are within safe regions
    assert slide3.title_bbox.x1 == 80
    assert slide3.title_bbox.y1 == 80
    assert slide3.title_bbox.x2 == 1072
    assert slide3.title_bbox.y2 == 180
    
    # 2. Check overlap logic (no two structural boxes may intersect inside content zone)
    for i, box_a in enumerate(slide3.step_cards):
        for j, box_b in enumerate(slide3.step_cards):
            if i != j:
                assert not check_intersection(box_a, box_b), f"Card {i} intersects with Card {j}"
```

#### 5.3 Color Integrity Verification
```python
def test_rendered_color_palette():
    # Render frame using virtual device
    canvas = RenderEngine.generate_frame(slide_index=1)
    
    # Extract dominant hex colors
    rendered_colors = canvas.get_unique_hex_colors()
    
    # Core system colors must be present
    assert "#003366" in rendered_colors, "Missing Primary Navy Dark Theme Color"
    assert "#FF9900" in rendered_colors, "Missing Highlight Accent Theme Color"
    
    # No colors outside permissible visual scheme list
    allowed_set = {"#003366", "#4A5568", "#F5F7FA", "#FF9900", "#28A745", "#1A202C", "#FFFFFF", "#000000"}
    for color in rendered_colors:
         assert color in allowed_set, f"Forbidden theme color leakage detected: {color}"
```

---

### 6. Evaluation Rubric

This project will be evaluated against a strict 100-point scale. Deviation from any criteria will trigger automatic deductions.

| Metric | Target Specification | Points Allocated | Violation Penalty |
| :--- | :--- | :--- | :--- |
| **Schema Strictness** | Validated database implementation of table schemas, structural constraints on `usr_id`, and `currency`. | 25 pts | -10 pts for missing foreign key constraint; -15 pts for missing `usr_id` string pattern constraints. |
| **Visual Accuracy** | Precise rendering matching the `1920x1080` screen size and the specified BBox layouts. | 25 pts | -5 pts per 10px boundary offset deviation; -15 pts for incorrect scaling/letterboxing behavior. |
| **Color Scheme Compliance** | Correct utilization of designated hex codes: `#003366`, `#4A5568`, `#F5F7FA`, `#FF9900`, `#28A745`, `#1A202C`. | 20 pts | -10 pts for use of alternative palette shades; -20 pts for failure to implement accent mapping on live query. |
| **Dynamic Execution Link** | Sandbox in Slide 4 executes real queries on `balance_storyboard.db` and visually steps through the execution path. | 20 pts | -15 pts if SQLite sandbox is non-functional or decoupled from visual highlight tracking. |
| **Test Coverage** | Full suite execution of `test_storyboard.py` covering all visual bounds, colors, and queries. | 10 pts | Fail-grade (0/10) if testing assertions fail to run or pass. |
## 4. Hardened Connection Specification
- Hard-coded sandbox path: `./balance.db`
- Connection pool size: 1 (Rigid Single-Threaded Access)
- Strict input validation regex: `^[a-zA-Z0-9-]{3,12}$`

## Adversarial Critic Feedback (FAIL - Rev 1)
- **Reason**: Generated code prints raw terminal string instead of the requested 'standard markdown table layout'.
- **Fix**: Code must format the output value inside a neat markdown table format:
| Customer ID | Balance |
|---|---|
| usr-9901 | $X.XX |
And implement SQLite connector exceptions safety.
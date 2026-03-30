# PsychR — Claude Code Context

## What Is This Project?

PsychR is a cross-platform Electron desktop application for psychological research.
It gives psychologists the full power of R through a point-and-click interface,
while automatically generating reproducible R syntax for every action taken.

## Tech Stack

- **Electron 30** (main process) + **React 18 + TypeScript** (renderer)
- **Tailwind CSS** for styling
- **Zustand** for global state (`src/store/index.ts`)
- **R via subprocess** (`electron/r-bridge.ts`) — calls user's installed R
- Simple HTML table in Phase 1 → **AG Grid** in Phase 2
- **Monaco Editor** for R script panel (Phase 2)

## Architecture: The R Bridge Protocol

Every analysis follows this exact pipeline:

1. User configures analysis via React UI
2. React calls `useRBridge().run(rScript, label)`
3. Main process writes R script to temp file, spawns `Rscript`
4. R script MUST output exactly ONE JSON object to stdout:
   ```json
   {
     "success": true,
     "r_script": "# Clean R code snippet...",
     "data": { "table": [...], "fit": {...} }
   }
   ```
5. RBridge parses JSON, appends `r_script` to session script
6. React renders the result and shows it in the Results panel

**CRITICAL**: Every R script must use `jsonlite::toJSON()` and output only JSON.
Wrap all output in `tryCatch` — see `electron/r-bridge.ts` for the wrapper template.

## File Structure

```
src/
  store/index.ts           ← Global Zustand state — read this first
  hooks/useRBridge.ts      ← Hook for calling R analyses
  tabs/
    DataCleaning/          ← Tab 1: import, grid, wrangling
    Analyze/               ← Tab 2: statistical analyses
      dialogs/             ← One dialog component per analysis type
    IRT/                   ← Tab 3: IRT models (mirt, TAM)
    Qualitative/           ← Tab 4: coding workspace
    Visualization/         ← Tab 5: ggplot2 builder
    Citations/             ← Tab 6: DOI → APA manager
    Markdown/              ← Tab 7: Quarto editor
  components/
    layout/WorkspaceLayout ← Standard 3-panel layout for all tabs
    shared/ScriptPanel     ← R script display (use on every tab's right panel)

electron/
  main.ts                  ← IPC handlers
  preload.ts               ← Context bridge (window.psychr.r.run, dialog, shell)
  r-bridge.ts              ← R subprocess manager

r-scripts/
  analyze/                 ← R script templates for statistical analyses
  irt/                     ← R script templates for IRT
  viz/                     ← ggplot2 templates
```

## Adding a New Statistical Analysis

Follow this pattern (use `DescriptivesDialog.tsx` as the reference implementation):

1. Add the analysis to the `ANALYSIS_CATEGORIES` array in `AnalyzeTab.tsx`
2. Create `src/tabs/Analyze/dialogs/YourAnalysisDialog.tsx`
3. The dialog must:
   - Let user select variables from `activeDataset.columns`
   - Build an R script string that outputs JSON with `success`, `r_script`, and `data`
   - Call `onRun(rScript, label)` which triggers the R bridge
   - Call `addResult(...)` to store the result in the Zustand store
4. Wire up the dialog in `AnalyzeTab.tsx`

## R Script Template for New Analyses

```r
library(PACKAGE)
library(jsonlite)

# df is the active dataset (in production: loaded from dataset store)
# variables selected by user come in as interpolated strings

result <- YOUR_ANALYSIS_FUNCTION(df[, c("var1", "var2")])

cat(toJSON(list(
  success = TRUE,
  r_script = "# Your clean reproducible snippet here",
  data = list(
    table = YOUR_RESULT_AS_LIST,
    effect_size = ...,
    p_value = ...
  )
), auto_unbox = TRUE))
```

## Global State Shape (Zustand)

Key state slices — see `src/store/index.ts` for full types:

- `datasets: Dataset[]` — loaded datasets with column metadata
- `activeDatasetId: string | null` — which dataset is active
- `activeDataset: Dataset | null` — computed getter
- `results: AnalysisResult[]` — all analysis results this session
- `sessionScript: string` — accumulated R code from all analyses
- `citations: Citation[]` — reference library (persisted)
- `qualCodes: QualCode[]` — qualitative codes (persisted)
- `settings` — R path, alpha, decimal places, etc. (persisted)

## Current Implementation Status (Phase 1 MVP)

### ✅ Done
- Electron main process + R bridge
- Context bridge (preload.ts)
- Zustand store with all state slices
- TabBar + all 7 tab routing
- WorkspaceLayout (3-panel layout)
- ScriptPanel (live R script display)
- DataCleaningTab: demo dataset, column type display, basic grid
- AnalyzeTab: full analysis category tree, result blocks
- DescriptivesDialog: working R analysis dialog
- IRTTab: model selection, item selection, full UI, demo analysis
- QualitativeTab: document + code management UI
- VisualizationTab: chart type selector, variable mapping, ggplot code preview
- CitationsTab: CrossRef API lookup, APA-7 formatting, export
- MarkdownTab: split editor/preview, result insertion, citation insertion

### 🔜 Phase 2 Next Steps
1. Replace HTML table with AG Grid in DataCleaningTab
2. Wire actual file import through R (haven, readr, readxl)
3. Add t-test dialog (independent, paired, one-sample)
4. Add one-way ANOVA dialog with post-hoc tests
5. Add Pearson correlation dialog + correlation matrix
6. Add simple/multiple linear regression dialog
7. Implement ggplot plot generation (requires base64enc R package)
8. Add Monaco editor to ScriptPanel

## R Package Requirements

Check all are installed before adding an analysis:
- `psych` — descriptive statistics (describe)
- `car` — ANOVA, Levene test
- `lme4` — mixed models
- `lavaan` — CFA/SEM
- `mirt` — IRT models
- `TAM` — Rasch models
- `ggplot2` — all visualization
- `haven` — .sav SPSS file import
- `readxl` — .xlsx import
- `readr` — .csv import
- `dplyr`, `tidyr` — data wrangling
- `duckdb`, `arrow` — large data support
- `jsonlite` — JSON output (ALWAYS required)
- `base64enc` — image encoding for plots

## Development Commands

```bash
npm run dev      # Start Electron + Vite dev server
npm run build    # Build for production
npm run dist     # Build installer (.dmg / .exe / .AppImage)
```

## Conventions

- All R scripts output JSON only — never raw text
- Every analysis appends R code to `sessionScript` via `appendToScript()`
- Results are always added to the `results` array via `addResult()`
- Dialog components follow the `onClose` / `onRun` prop pattern
- Use `WorkspaceLayout` for all tab layouts
- Use `ScriptPanel` as the right panel on every analysis tab

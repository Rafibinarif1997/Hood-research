# RHØ CALLS — GitHub Pages Main-Branch Edition

A browser-only Robinhood Chain meme research terminal. No GitHub Actions, no Supabase, no server and no API key.

## Architecture

GitHub main branch → GitHub Pages → browser → Robinhood Chain public RPC → Pons on-chain launch/curve events.

The browser discovers recent Pons launches, reads `CurveBuy` / `CurveSell` events, calculates buy pressure, trader breadth, momentum, risk and a transparent heuristic call score. Recent snapshots are stored only in the visitor's browser `localStorage` for acceleration comparisons.

## Deploy

1. Create a GitHub repository.
2. Put `index.html` in the repository root (main branch).
3. Settings → Pages → Deploy from a branch → `main` → `/root`.
4. Open the Pages URL.

No build step is required.

## Important limitations

- GitHub Pages is static. There is no shared persistent database.
- Each visitor's browser independently queries the public RPC and keeps its own local snapshot history.
- RPC/CORS availability can affect browser-side scanning.
- The app uses recent blocks rather than a full historical archive.
- Scores are heuristic research signals, not financial advice or guaranteed predictions.

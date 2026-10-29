---
'granary-ai': patch
---

Default installed reference material to `.granary/context/` and share upstream baselines under `.granary/cache/baselines/` across all output destinations. Generate `.granary/.gitignore` so context and cache stay out of Git while `granary.json` and `granary-lock.json` remain at the project root. Preserve explicit output overrides and fail safely on edited ignore files.

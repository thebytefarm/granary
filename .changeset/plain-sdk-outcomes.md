---
'granary-ai': patch
---

Return clients directly from granary() and createGranary(), throwing classified errors for invalid construction. Expose Granary-owned plain Outcome types for SDK operations without leaking massaman types into public declarations.

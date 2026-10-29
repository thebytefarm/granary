---
'granary-ai': patch
---

Separate core, SDK, CLI, and prebuilt plugins into workspace packages, with granary-ai as the convenience distribution. Make granary() work without arguments or plugins. Move standards interpretation and reviewed-content validation into opt-in plugins, expose read-only document capabilities, and replace top-level standards settings with namespaced plugins.standards configuration without legacy compatibility.

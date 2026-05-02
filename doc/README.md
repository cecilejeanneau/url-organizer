# Documentation

This folder contains simple architecture notes and diagrams.

Files:

- `architecture.puml` — PlantUML diagram showing high-level components.

Render instructions:

1. Install PlantUML (and Graphviz) or use an online renderer like https://www.plantuml.com/plantuml.
2. Locally, run:

```bash
plantuml doc/architecture.puml
```

This will generate `architecture.png` in the same folder.

Notes:

- The diagram is intentionally high-level — it documents the browser frontend, Express backend, and MongoDB persistence.
- Update the diagram when you change architecture or add integrations (CI, webhooks, etc.).

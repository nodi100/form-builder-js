---
"@iteasa/form-builder-js": minor
---

New `layout: "accordion"`: every step is a collapsible section on one page, with a clickable header showing the title, the `description` as a subtitle and an arrow. Steps take a new `defaultOpen` option (accordion only, default collapsed) and every section needs a `title`. Collapsed fields keep their values and are still validated and submitted; after a failed submit, sections with errors expand. New class slots `accordion`, `accordionHeader`, `accordionTitle`, `accordionDescription`, `accordionIcon`, `accordionIconOpen`, `accordionPanel`.

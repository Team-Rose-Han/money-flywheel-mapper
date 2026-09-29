# Money Flywheel Map — Canva kit

`money-flywheel-map.pptx` is the map built from separate, editable pieces.

## Get it into Canva

1. In Canva, click **Create a design → Import file** (or drag the file onto the home page).
2. Choose `money-flywheel-map.pptx`. Canva opens it as a 3-page design:
   - **Page 1**: Rose's map, as in the original
   - **Page 2**: the same map titled "Your Money Flywheel Map", to copy for members
   - **Page 3**: spare parts (hub, bucket and small cards, navy card, lime pill, lines, dots, arrow) for adding accounts

## Editing

- **Text**: double-click any card, the title, the pill or "Pay yourself" and type.
  The label is typed inside its card, so it stays centred when you resize the card.
- **Card size**: click a card and drag its corner or side handles.
- **Lines**: they are separate lines. After moving or resizing a card, drag the line
  ends to meet it again. The arrowhead is two short lines; select both to move it.
- **Colours**: select an element and use the colour swatch in the toolbar.

## Style reference

| Element | Value |
|---|---|
| Font | Poppins Bold (Canva has it built in) |
| Card text | 18 pt, letter spacing about 250 |
| Title | 34 pt, letter spacing about 60 |
| Navy (Revenue card) | `#0B1D80` |
| Line blue | `#1E3AB8`, 3 px |
| Card border | `#141414`, 3 px, corner radius 22 |
| Lime pill | `#D9FF3B` |
| Canvas | 2000 × 940 px, white |

If Poppins doesn't show after import, select all text and pick Poppins in Canva's font menu.

To regenerate the file after changing sizes or labels in the script: `python3 build_kit.py`
(needs `pip install python-pptx`).

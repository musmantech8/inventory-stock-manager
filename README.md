# Inventory & Stock Manager

A stock control application for products, stock movements and low-stock alerts.
It has two parts:

- **Database (`/sql`)** — Oracle tables for categories, suppliers, products and stock movements. A trigger keeps the quantity on hand correct and blocks negative stock; a view lists items to reorder; a PL/SQL package handles receiving and issuing stock.
- **Web demo (root folder)** — a working front end in plain HTML, CSS and JavaScript using the same rules.

## Features

- KPI cards: products, total stock value, items needing reorder, movements today
- Stock value by category chart and a low-stock alert list with one-click restock
- Searchable, sortable product table filtered by category and stock level
- Add, edit and delete products (unique SKU check)
- Stock in / stock out with a full movement history; issuing more than is on hand is blocked — the same rule as the `INV_STOCK_MOVEMENTS_BI` trigger
- Data saved in the browser (localStorage), with a "Reset demo data" button

## Run the web demo

Open `index.html` in a browser — no install needed.
In VS Code you can also use the **Live Server** extension.

## Set up the database (Oracle / Oracle APEX)

| Script | What it creates |
| --- | --- |
| `sql/01_schema.sql` | `INV_CATEGORIES`, `INV_SUPPLIERS`, `INV_PRODUCTS`, `INV_STOCK_MOVEMENTS`, stock trigger, `INV_LOW_STOCK_V`, sample data |
| `sql/02_inventory_pkg.sql` | `INV_STOCK_PKG` — receive/issue stock, stock value, quantity on a past date — plus report queries |

### Suggested APEX pages

1. **Dashboard** — cards plus a bar chart of stock value by category
2. **Products** — interactive report with a "Low stock" highlight from `INV_LOW_STOCK_V`
3. **Stock in / out** — modal dialog calling `inv_stock_pkg.receive_stock` / `issue_stock`
4. **Movement history** — interactive report using the running-balance query

## Tech

Oracle SQL · PL/SQL · HTML · CSS · JavaScript

---

Built by [Muhammad Usman](https://github.com/musmantech8) — Oracle APEX Developer.

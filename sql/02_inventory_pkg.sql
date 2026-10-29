-- =============================================================
-- INV_STOCK_PKG — stock operations and reporting helpers
-- Example APEX usage (page process on the "Stock in / out" dialog):
--   inv_stock_pkg.issue_stock(p_sku => :P10_SKU, p_quantity => :P10_QTY, p_reference => :P10_NOTE);
-- =============================================================

CREATE OR REPLACE PACKAGE inv_stock_pkg AS

  PROCEDURE receive_stock (
    p_sku       IN inv_products.sku%TYPE,
    p_quantity  IN NUMBER,
    p_reference IN VARCHAR2 DEFAULT NULL
  );

  PROCEDURE issue_stock (
    p_sku       IN inv_products.sku%TYPE,
    p_quantity  IN NUMBER,
    p_reference IN VARCHAR2 DEFAULT NULL
  );

  FUNCTION stock_value (p_category_id IN inv_categories.category_id%TYPE DEFAULT NULL) RETURN NUMBER;

  FUNCTION qty_on_date (
    p_product_id IN inv_products.product_id%TYPE,
    p_as_of      IN DATE
  ) RETURN NUMBER;

END inv_stock_pkg;
/

CREATE OR REPLACE PACKAGE BODY inv_stock_pkg AS

  FUNCTION product_id_for (p_sku IN VARCHAR2) RETURN NUMBER IS
    l_id inv_products.product_id%TYPE;
  BEGIN
    SELECT product_id INTO l_id
      FROM inv_products
     WHERE sku = UPPER(TRIM(p_sku))
       AND is_active = 'Y';
    RETURN l_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20202, 'No active product with SKU ' || p_sku || '.');
  END product_id_for;

  PROCEDURE record_movement (p_sku VARCHAR2, p_type VARCHAR2, p_quantity NUMBER, p_reference VARCHAR2) IS
  BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
      RAISE_APPLICATION_ERROR(-20203, 'Quantity must be greater than zero.');
    END IF;

    -- The INV_STOCK_MOVEMENTS_BI trigger updates QTY_ON_HAND and blocks negative stock
    INSERT INTO inv_stock_movements (product_id, movement_type, quantity, reference)
    VALUES (product_id_for(p_sku), p_type, p_quantity, p_reference);
  END record_movement;

  PROCEDURE receive_stock (
    p_sku       IN inv_products.sku%TYPE,
    p_quantity  IN NUMBER,
    p_reference IN VARCHAR2 DEFAULT NULL
  ) IS
  BEGIN
    record_movement(p_sku, 'IN', p_quantity, p_reference);
  END receive_stock;

  PROCEDURE issue_stock (
    p_sku       IN inv_products.sku%TYPE,
    p_quantity  IN NUMBER,
    p_reference IN VARCHAR2 DEFAULT NULL
  ) IS
  BEGIN
    record_movement(p_sku, 'OUT', p_quantity, p_reference);
  END issue_stock;

  FUNCTION stock_value (p_category_id IN inv_categories.category_id%TYPE DEFAULT NULL) RETURN NUMBER IS
    l_value NUMBER;
  BEGIN
    SELECT NVL(SUM(qty_on_hand * unit_price), 0)
      INTO l_value
      FROM inv_products
     WHERE is_active = 'Y'
       AND (p_category_id IS NULL OR category_id = p_category_id);
    RETURN l_value;
  END stock_value;

  -- Rebuilds the quantity on any past date from the movement history
  FUNCTION qty_on_date (
    p_product_id IN inv_products.product_id%TYPE,
    p_as_of      IN DATE
  ) RETURN NUMBER IS
    l_qty NUMBER;
  BEGIN
    SELECT NVL(SUM(CASE movement_type WHEN 'IN' THEN quantity ELSE -quantity END), 0)
      INTO l_qty
      FROM inv_stock_movements
     WHERE product_id = p_product_id
       AND movement_date < TRUNC(p_as_of) + 1;
    RETURN l_qty;
  END qty_on_date;

END inv_stock_pkg;
/

-- -------------------------------------------------------------
-- Reports (APEX charts / interactive reports)
-- -------------------------------------------------------------

-- Stock value by category
SELECT c.category_name,
       SUM(p.qty_on_hand)                AS units,
       SUM(p.qty_on_hand * p.unit_price) AS stock_value
  FROM inv_products p
  JOIN inv_categories c ON c.category_id = p.category_id
 WHERE p.is_active = 'Y'
 GROUP BY c.category_name
 ORDER BY stock_value DESC;

-- Reorder list
SELECT sku, product_name, supplier_name, qty_on_hand, reorder_level, suggested_order_qty
  FROM inv_low_stock_v
 ORDER BY qty_on_hand;

-- Movement history with running balance (analytic function)
SELECT p.sku,
       m.movement_date,
       m.movement_type,
       m.quantity,
       SUM(CASE m.movement_type WHEN 'IN' THEN m.quantity ELSE -m.quantity END)
         OVER (PARTITION BY m.product_id ORDER BY m.movement_date, m.movement_id) AS running_balance,
       m.reference
  FROM inv_stock_movements m
  JOIN inv_products p ON p.product_id = m.product_id
 ORDER BY p.sku, m.movement_date, m.movement_id;

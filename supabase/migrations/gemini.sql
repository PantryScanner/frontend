ALTER TABLE dispense_products 
ADD CONSTRAINT unique_dispensa_product UNIQUE (dispensa_id, product_id);
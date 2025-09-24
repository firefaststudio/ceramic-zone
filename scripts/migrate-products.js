// scripts/migrate-products.js
// Migration script to populate products table with initial data

const { Client } = require('pg');
const fs = require('fs');

async function migrateProducts() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to database for product migration');

        // Additional sample products to insert
        const products = [
            {
                name: 'Ceramic Sculpture',
                description: 'Abstract ceramic sculpture for home decoration',
                price: 89.99,
                category: 'sculptures',
                stock_quantity: 8
            },
            {
                name: 'Ceramic Teapot',
                description: 'Traditional ceramic teapot with infuser',
                price: 55.99,
                category: 'teapots',
                stock_quantity: 12
            },
            {
                name: 'Ceramic Candle Holder',
                description: 'Elegant ceramic candle holder set',
                price: 25.99,
                category: 'decor',
                stock_quantity: 20
            },
            {
                name: 'Ceramic Garden Pot',
                description: 'Large ceramic pot for outdoor plants',
                price: 75.99,
                category: 'garden',
                stock_quantity: 6
            },
            {
                name: 'Ceramic Dinner Set',
                description: 'Complete ceramic dinner set for 4 people',
                price: 149.99,
                category: 'sets',
                stock_quantity: 5
            }
        ];

        // Insert products one by one
        let insertedCount = 0;
        for (const product of products) {
            try {
                const result = await client.query(`
                    INSERT INTO products (name, description, price, category, stock_quantity)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (name) DO UPDATE SET
                        description = EXCLUDED.description,
                        price = EXCLUDED.price,
                        category = EXCLUDED.category,
                        stock_quantity = EXCLUDED.stock_quantity,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id, name
                `, [product.name, product.description, product.price, product.category, product.stock_quantity]);

                console.log(`Inserted/Updated product: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
                insertedCount++;
            } catch (err) {
                console.error(`Error inserting product ${product.name}:`, err.message);
            }
        }

        // Get total count of products
        const countResult = await client.query('SELECT COUNT(*) as total FROM products');
        console.log(`Migration completed. Total products in database: ${countResult.rows[0].total}`);
        console.log(`Products processed in this migration: ${insertedCount}`);

        // Create migration log
        const migrationLog = {
            timestamp: new Date().toISOString(),
            database_url: process.env.DATABASE_URL ? 'Set (redacted)' : 'Not set',
            products_processed: insertedCount,
            total_products: parseInt(countResult.rows[0].total),
            status: 'success'
        };

        fs.writeFileSync('migration-log.txt', JSON.stringify(migrationLog, null, 2));
        console.log('Migration log written to migration-log.txt');

    } catch (error) {
        console.error('Migration failed:', error);
        
        // Write error log
        const errorLog = {
            timestamp: new Date().toISOString(),
            database_url: process.env.DATABASE_URL ? 'Set (redacted)' : 'Not set',
            error: error.message,
            status: 'failed'
        };
        
        fs.writeFileSync('migration-log.txt', JSON.stringify(errorLog, null, 2));
        process.exit(1);
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    migrateProducts();
}

module.exports = { migrateProducts };
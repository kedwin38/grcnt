-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'package',
    "requiresImage" BOOLEAN NOT NULL DEFAULT false,
    "tracksStock" BOOLEAN NOT NULL DEFAULT false,
    "instantTopup" BOOLEAN NOT NULL DEFAULT true,
    "requiresRouterNumber" BOOLEAN NOT NULL DEFAULT false,
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "fields" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Category" ("active", "createdAt", "description", "fields", "icon", "id", "instantTopup", "name", "requiresImage", "requiresRouterNumber", "slug", "sortOrder", "tracksStock", "updatedAt") SELECT "active", "createdAt", "description", "fields", "icon", "id", "instantTopup", "name", "requiresImage", "requiresRouterNumber", "slug", "sortOrder", "tracksStock", "updatedAt" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "compareAtPrice" INTEGER,
    "images" TEXT NOT NULL DEFAULT '[]',
    "attributes" TEXT NOT NULL DEFAULT '{}',
    "stock" INTEGER,
    "lowStockAt" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "hotSale" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("active", "attributes", "categoryId", "compareAtPrice", "createdAt", "description", "featured", "id", "images", "lowStockAt", "name", "price", "slug", "sortOrder", "stock", "updatedAt") SELECT "active", "attributes", "categoryId", "compareAtPrice", "createdAt", "description", "featured", "id", "images", "lowStockAt", "name", "price", "slug", "sortOrder", "stock", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Preserve today's homepage: categories that currently show their own
-- "bundle section" there (via instantTopup) keep showing after the
-- homepage switches to the new, admin-controlled showOnHome flag.
UPDATE "Category" SET "showOnHome" = true WHERE "instantTopup" = true;

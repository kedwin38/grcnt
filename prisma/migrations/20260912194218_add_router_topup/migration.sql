-- AlterTable
ALTER TABLE "Order" ADD COLUMN "routerNumber" TEXT;

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
    "fields" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Category" ("active", "createdAt", "description", "fields", "icon", "id", "instantTopup", "name", "requiresImage", "slug", "sortOrder", "tracksStock", "updatedAt") SELECT "active", "createdAt", "description", "fields", "icon", "id", "instantTopup", "name", "requiresImage", "slug", "sortOrder", "tracksStock", "updatedAt" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

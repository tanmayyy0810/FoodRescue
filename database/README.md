# FoodRescue Oracle Database

FoodRescue uses Oracle Database 21c XE to manage food donations, NGO requests, donor acceptances, food allocations, and deliveries.

## Database Objects

| Script | Contents |
|---|---|
| `01_tables.sql` | 11 tables, including primary keys, foreign keys, and constraints |
| `02_sequences.sql` | 7 sequences for generating record IDs |
| `03_procedures.sql` | 12 stored procedures |
| `04_functions.sql` | 2 functions |
| `05_package.sql` | `FOODRESCUE_PKG` specification and body |
| `06_triggers.sql` | 2 database triggers |

## Intended Installation Order

For a new, empty `FOODRESCUE` schema:

1. `01_tables.sql`
2. `02_sequences.sql`
3. `04_functions.sql`
4. `03_procedures.sql`
5. `05_package.sql`
6. `06_triggers.sql`

The exported table definitions refer explicitly to the `FOODRESCUE` schema, so that schema must exist before running the scripts.

**Installation status:** These scripts have passed structural checks but have not yet been tested together in a fresh Oracle schema. The installation order is provisional until that test is complete.

## Sequence Numbering

Transaction record sequences start at `1001`. The user account sequence starts at `1`. These values are intended for an empty database and must not be used to reset sequences in an existing database.

## Safety Notes

- Do not run the installation scripts against an existing populated FoodRescue database.
- The repository contains database object definitions, not a full database backup.
- Database credentials and real user account records should not be committed to GitHub.
- Server-side authorization and credential-storage improvements are still pending before production deployment.
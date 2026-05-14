# URL Organizer (MongoDB)

Small local web app to organize recovered URLs with persistent storage in MongoDB.

Runtime dependency footprint: only `express` + `mongodb`.

## Features

- Persistent delete (soft delete) in MongoDB
- Rename each link individually (`name` field)
- Assign categories to each URL
- Define category color + icon
- Filter by search/category/domain/name
- Import URLs from `.local/urls_import.md.local`

## Requirements

- Node.js 18+
- Local MongoDB server

## Run

```bash
cd url-organizer
pnpm install
pnpm start
```

Open: `http://localhost:3210`

## Config

Environment variables:

- `PORT` (default: `3210`)
- `MONGO_URI` (default: `mongodb://127.0.0.1:27017`)
- `DB_NAME` (default: `url_organizer`)
- `IMPORT_FILE` (default: `<project>/.local/urls_import.md.local`)

## Notes

- Import endpoint reads.
- URLs are deduplicated by unique index.
- Category metadata is stored in `categories` collection (`name`, `color`, `icon`).

## License

MIT

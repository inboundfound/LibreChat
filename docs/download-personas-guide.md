# How to Download personas.md from MongoDB

This guide explains how to retrieve the `personas.md` file from the LibreChat MongoDB database and download it to your local system.

## Prerequisites

- Access to the server running LibreChat
- Docker installed and running
- LibreChat containers running (`LibreChat` and `chat-mongodb`)

## Step 1: Connect to MongoDB

First, connect to the MongoDB container to explore the database:

```bash
docker exec -it chat-mongodb mongosh
```

## Step 2: Query the Files Collection

Once in the MongoDB shell, switch to the LibreChat database and query for personas.md:

```javascript
use LibreChat
db.files.find({filename: "personas.md"}).pretty()
```

This will show all versions of `personas.md` with their metadata including:

- `file_id`: Unique identifier
- `filename`: File name
- `filepath`: Storage location
- `source`: Storage type (`local` or `vectordb`)
- `createdAt`: Upload timestamp
- `bytes`: File size

## Step 3: Identify the Latest File

Look for the most recent file by checking the `createdAt` field. The latest version will typically have:

- `source: 'local'` (stored in filesystem)
- Most recent `createdAt` timestamp
- A `filepath` starting with `/uploads/`

Example output:

```javascript
{
  _id: ObjectId('6903b54955309880c424f90d'),
  file_id: '375ab69e-f8fe-444e-ba96-9bc6387438f7',
  filename: 'personas.md',
  filepath: '/uploads/685ae7e3726a1064569e8069/375ab69e-f8fe-444e-ba96-9bc6387438f7__personas.md',
  source: 'local',
  createdAt: ISODate('2025-10-30T18:58:17.853Z'),
  bytes: 13867
}
```

## Step 4: Find the File in the Container

Exit the MongoDB shell (type `exit`) and search for the file in the LibreChat container:

```bash
docker exec LibreChat find /app -name "*personas.md" 2>/dev/null
```

This will return the full path(s) to the file(s), for example:

```
/app/uploads/685ae7e3726a1064569e8069/375ab69e-f8fe-444e-ba96-9bc6387438f7__personas.md
```

## Step 5: Download the File

Use `docker cp` to copy the file from the container to your local system:

```bash
docker cp LibreChat:/app/uploads/685ae7e3726a1064569e8069/375ab69e-f8fe-444e-ba96-9bc6387438f7__personas.md ./personas.md
```

Replace the path with the actual path from Step 4.

## Quick Command Reference

### One-liner to query MongoDB from command line:

```bash
echo 'db.files.find({filename: "personas.md"}).pretty()' | docker exec -i chat-mongodb mongosh LibreChat --quiet
```

### Find all personas.md files:

```bash
docker exec LibreChat find /app -name "*personas.md" 2>/dev/null
```

### Copy the latest file (update path as needed):

```bash
docker cp LibreChat:/app/uploads/<user_id>/<file_id>__personas.md ./personas.md
```

## Troubleshooting

### File not found in expected location

If the file shows `source: 'vectordb'` instead of `source: 'local'`, it may only exist in the vector database and not as a standalone file. In this case, you'll need to:

1. Check if there's a more recent version with `source: 'local'`
2. Or retrieve it through the LibreChat API/interface

### Permission denied

Ensure you have proper permissions to execute docker commands. You may need to use `sudo`:

```bash
sudo docker cp LibreChat:/app/uploads/... ./personas.md
```

### Multiple versions exist

If multiple versions exist, compare the `createdAt` timestamps and choose the most recent one, or download all versions with different names:

```bash
docker cp LibreChat:/app/uploads/.../file1__personas.md ./personas-v1.md
docker cp LibreChat:/app/uploads/.../file2__personas.md ./personas-v2.md
```

## Notes

- Files with `source: 'vectordb'` are embedded in the RAG system and may not have a direct file path
- Files with `source: 'local'` are stored in the `/app/uploads` directory inside the LibreChat container
- The file naming convention includes the user ID and file ID for uniqueness
- Always verify you're downloading the correct version by checking the `createdAt` timestamp

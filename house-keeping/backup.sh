#!/bin/bash

# Check if mongodump is installed
if ! command -v mongodump &> /dev/null
then
    echo "Error: mongodump is not installed or not in your PATH."
    echo "Please install MongoDB tools or ensure mongodump is accessible."
    exit 1
fi

# MongoDB connection details
DB_NAME="resqtalk"
DB_HOST="localhost:27017"

# Timestamp for unique backup and archive names
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Directory where mongodump will output the current backup
CURRENT_BACKUP_DIR="./$DB_NAME-$TIMESTAMP"

echo "Starting MongoDB backup for database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Backup destination: $CURRENT_BACKUP_DIR"

# Create the directory for the current mongodump output
mkdir -p "$CURRENT_BACKUP_DIR"

# Run mongodump
mongodump --host "$DB_HOST" --db "$DB_NAME" --out "$CURRENT_BACKUP_DIR"

if [ $? -ne 0 ]; then
  echo "Error: MongoDB backup failed."
  exit 1
fi

echo "MongoDB backup completed successfully to $CURRENT_BACKUP_DIR"

# --- Archiving steps ---

# Create a temporary parent directory for the tarball content
TAR_TEMP_PARENT_DIR="./temp_archive_$TIMESTAMP"

# Create the 'backups' directory inside the temporary parent directory
# This directory will be the root of the tarball content
TAR_SOURCE_DIR="$TAR_TEMP_PARENT_DIR/backups"
mkdir -p "$TAR_SOURCE_DIR"

echo "Moving current backup to $TAR_SOURCE_DIR"
# Move the current backup into the 'backups' directory within the temporary parent
mv "$CURRENT_BACKUP_DIR" "$TAR_SOURCE_DIR/"

# Path to offline_map.db
OFFLINE_MAP_DB="../backend/offline_map.db"

# Check if offline_map.db exists and copy it to the tar source directory
if [ -f "$OFFLINE_MAP_DB" ]; then
  echo "Copying offline_map.db to $TAR_SOURCE_DIR"
  cp "$OFFLINE_MAP_DB" "$TAR_SOURCE_DIR/"
else
  echo "offline_map.db not found at $OFFLINE_MAP_DB, skipping copy."
fi

# Define the tarball name and path
TARBALL_NAME="${DB_NAME}_backup_${TIMESTAMP}.tar.gz"
TARBALL_PATH="./$TARBALL_NAME"


echo "Creating tarball: $TARBALL_PATH"
# Create the tarball from the temporary parent directory
# -C "$TAR_TEMP_PARENT_DIR" changes directory before archiving
# "." archives the content of the current directory (which is TAR_TEMP_PARENT_DIR)
tar -czf "$TARBALL_PATH" -C "$TAR_TEMP_PARENT_DIR" .

if [ $? -eq 0 ]; then
  echo "Tarball created successfully: $TARBALL_PATH"
else
  echo "Error: Tarball creation failed."
  # Clean up even if tar fails
  rm -rf "$TAR_TEMP_PARENT_DIR"
  exit 1
fi

echo "Cleaning up temporary directory: $TAR_TEMP_PARENT_DIR"
# Clean up the temporary parent directory
rm -rf "$TAR_TEMP_PARENT_DIR"

echo "Script finished."

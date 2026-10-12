#!/bin/sh
# Fix permissions for the SQLite volume
chown -R app:app /app/data

# Drop privileges and run the application
# Using gosu to handle signal propagation correctly
exec gosu app uvicorn main:app --host 0.0.0.0 --port 8000

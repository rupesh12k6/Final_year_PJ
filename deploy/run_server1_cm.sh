#!/bin/bash
# ==============================================================================
# SERVER 1 DEPLOYMENT SCRIPT: CONSENT MANAGER (CM) - LINUX / BASH
# Run on Server 1 (e.g., Central Consortium Host)
# ==============================================================================

PORT=${PORT:-8095}
DB_URL=${SPRING_DATASOURCE_URL:-"jdbc:postgresql://localhost:5432/consent_manager_db_fyp"}
DB_USER=${SPRING_DATASOURCE_USERNAME:-"postgres"}
DB_PASS=${SPRING_DATASOURCE_PASSWORD:-"root"}

echo "=========================================================="
echo " DEPLOYING SERVER 1: CONSENT MANAGER (PORT $PORT)"
echo "=========================================================="
echo "Database: $DB_URL"

export PORT=$PORT
export SPRING_DATASOURCE_URL=$DB_URL
export SPRING_DATASOURCE_USERNAME=$DB_USER
export SPRING_DATASOURCE_PASSWORD=$DB_PASS

mvn spring-boot:run -pl consent-manager/backend

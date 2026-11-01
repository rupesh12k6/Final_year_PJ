#!/bin/bash
# ==============================================================================
# SERVER 2 DEPLOYMENT SCRIPT: COLLEGE A - LINUX / BASH
# Run on Server 2 (Institution A Host)
# ==============================================================================

PORT=${PORT:-8081}
CM_URL=${APP_CM_BASE_URL:-"http://localhost:8095"}
DB_URL=${SPRING_DATASOURCE_URL:-"jdbc:postgresql://localhost:5432/college_a_db"}
DB_USER=${SPRING_DATASOURCE_USERNAME:-"postgres"}
DB_PASS=${SPRING_DATASOURCE_PASSWORD:-"root"}

echo "=========================================================="
echo " DEPLOYING SERVER 2: COLLEGE A UNIVERSITY (PORT $PORT)"
echo "=========================================================="
echo "Remote Consent Manager: $CM_URL"
echo "Database: $DB_URL"

export PORT=$PORT
export APP_COLLEGE_CODE="COLLEGE_A"
export APP_COLLEGE_NAME="College A University"
export APP_CM_BASE_URL=$CM_URL
export APP_INTERNAL_API_KEY="A-INTERNAL-SECRET-KEY"
export SPRING_DATASOURCE_URL=$DB_URL
export SPRING_DATASOURCE_USERNAME=$DB_USER
export SPRING_DATASOURCE_PASSWORD=$DB_PASS

mvn spring-boot:run -pl college-a/backend

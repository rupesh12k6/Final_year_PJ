#!/bin/bash
# ==============================================================================
# SERVER 3 DEPLOYMENT SCRIPT: COLLEGE B - LINUX / BASH
# Run on Server 3 (Institution B Host)
# Notice: Uses the EXACT SAME codebase as College A, configured via environment.
# ==============================================================================

PORT=${PORT:-8082}
CM_URL=${APP_CM_BASE_URL:-"http://localhost:8095"}
DB_URL=${SPRING_DATASOURCE_URL:-"jdbc:postgresql://localhost:5432/college_b_db"}
DB_USER=${SPRING_DATASOURCE_USERNAME:-"postgres"}
DB_PASS=${SPRING_DATASOURCE_PASSWORD:-"root"}

echo "=========================================================="
echo " DEPLOYING SERVER 3: COLLEGE B UNIVERSITY (PORT $PORT)"
echo "=========================================================="
echo "Remote Consent Manager: $CM_URL"
echo "Database: $DB_URL"

export PORT=$PORT
export APP_COLLEGE_CODE="COLLEGE_B"
export APP_COLLEGE_NAME="College B University"
export APP_CM_BASE_URL=$CM_URL
export APP_INTERNAL_API_KEY="B-INTERNAL-SECRET-KEY"
export SPRING_DATASOURCE_URL=$DB_URL
export SPRING_DATASOURCE_USERNAME=$DB_USER
export SPRING_DATASOURCE_PASSWORD=$DB_PASS

mvn spring-boot:run -pl college-b/backend

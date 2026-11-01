# Multi-Stage Dockerfile for DEPA College B Consumer (Server 3)
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
COPY college-b/backend college-b/backend
RUN mvn clean package -pl college-b/backend -am -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

ENV PORT=8082 \
    APP_COLLEGE_CODE=COLLEGE_B \
    APP_COLLEGE_NAME="College B University" \
    APP_CM_BASE_URL="http://server1-cm:8095" \
    APP_INTERNAL_API_KEY="B-INTERNAL-SECRET-KEY" \
    SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/college_b_db" \
    SPRING_DATASOURCE_USERNAME="postgres" \
    SPRING_DATASOURCE_PASSWORD="root"

COPY --from=build /app/college-b/backend/target/*.jar app.jar

EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]

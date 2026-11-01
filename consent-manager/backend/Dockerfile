# Multi-Stage Dockerfile for DEPA Consent Manager (Server 1)
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
COPY consent-manager/backend consent-manager/backend
RUN mvn clean package -pl consent-manager/backend -am -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

ENV PORT=8095 \
    SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/consent_manager_db_fyp" \
    SPRING_DATASOURCE_USERNAME="postgres" \
    SPRING_DATASOURCE_PASSWORD="root"

COPY --from=build /app/consent-manager/backend/target/*.jar app.jar

EXPOSE 8095
ENTRYPOINT ["java", "-jar", "app.jar"]

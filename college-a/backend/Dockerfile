# Multi-Stage Dockerfile for DEPA College A Provider (Server 2)
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
COPY college-a/backend college-a/backend
RUN mvn clean package -pl college-a/backend -am -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

ENV PORT=8081 \
    APP_COLLEGE_CODE=COLLEGE_A \
    APP_COLLEGE_NAME="College A University" \
    APP_CM_BASE_URL="http://server1-cm:8095" \
    APP_INTERNAL_API_KEY="A-INTERNAL-SECRET-KEY" \
    SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/college_a_db" \
    SPRING_DATASOURCE_USERNAME="postgres" \
    SPRING_DATASOURCE_PASSWORD="root"

COPY --from=build /app/college-a/backend/target/*.jar app.jar

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]

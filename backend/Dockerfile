# Build stage: compile and package with the Maven wrapper.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
# Dependencies are resolved in their own layer so code changes do not re-download them.
RUN ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q package -DskipTests

# Run stage: JRE only, as a non-root user.
FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system --no-create-home subtrack
COPY --from=build /app/target/*.jar app.jar
USER subtrack
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

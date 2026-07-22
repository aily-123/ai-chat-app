FROM eclipse-temurin:17-jdk
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests -q
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "target/ai-chat-backend-1.0.0.jar"]

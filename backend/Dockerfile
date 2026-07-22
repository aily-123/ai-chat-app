# Spring Boot 后端 Dockerfile
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# 复制 Maven Wrapper
COPY .mvn .mvn
COPY mvnw.cmd .

# 安装 Maven 并构建（跳过测试加速）
RUN apk add --no-cache maven && mvn clean package -DskipTests -q

# 运行阶段
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# H2 数据库文件存储目录
RUN mkdir -p /app/data
EXPOSE 8080
# 使用 H2 文件数据库，数据存储在 /app/data
ENTRYPOINT ["java", "-jar", "app.jar"]
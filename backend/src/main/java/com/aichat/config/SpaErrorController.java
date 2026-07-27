package com.aichat.config;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaErrorController implements ErrorController {

    @RequestMapping("/error")
    public Object handleError(HttpServletRequest request) {
        Object statusObj = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int status = statusObj != null ? Integer.parseInt(statusObj.toString()) : 500;
        String path = (String) request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        String method = request.getMethod();

        if (path == null) {
            path = request.getRequestURI();
        }

        // API 路径：始终返回 JSON 错误
        if (path.startsWith("/api/")) {
            HttpStatus httpStatus = HttpStatus.valueOf(status);
            return ResponseEntity.status(httpStatus)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(java.util.Map.of(
                            "error", httpStatus.getReasonPhrase(),
                            "status", status,
                            "path", path
                    ));
        }

        // H2 控制台：返回错误
        if (path.startsWith("/h2-console")) {
            return ResponseEntity.status(status)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(java.util.Map.of("error", "Not Found", "status", status));
        }

        // 静态资源（含 .）：返回 404
        if (path.contains(".")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(java.util.Map.of("error", "Not Found", "status", 404));
        }

        // 非 GET 请求：返回 404 JSON
        if (!"GET".equalsIgnoreCase(method)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(java.util.Map.of("error", "Not Found", "status", 404));
        }

        // 其余 GET 请求（前端路由）：forward 到 index.html
        return "forward:/index.html";
    }
}

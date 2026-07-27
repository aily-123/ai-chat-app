package com.aichat.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * SPA 路由转发 Filter（低优先级，在所有业务 Filter 之后执行）：
 * - /api/**    → 直接放行（由 REST Controller 处理）
 * - 含 "." 的路径 → 直接放行（静态资源 .js/.css/.png 等）
 * - 其余 GET 请求 → forward 到 /index.html（前端路由接管）
 * - 非 GET 请求到非 API 路径 → 返回 404，不 forward
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class SpaForwardFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        // API 路径：放行
        if (path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        // H2 控制台：放行
        if (path.startsWith("/h2-console")) {
            chain.doFilter(request, response);
            return;
        }

        // 静态资源（含 "."）：放行
        if (path.contains(".")) {
            chain.doFilter(request, response);
            return;
        }

        // 根路径：forward
        if ("/".equals(path)) {
            request.getRequestDispatcher("/index.html").forward(request, response);
            return;
        }

        // 非 GET 请求到非 API/非静态路径：404（避免 POST/PUT/DELETE 被 forward 到 index.html 导致 405）
        if (!"GET".equalsIgnoreCase(method)) {
            response.setStatus(404);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"error\":\"Not Found\",\"status\":404}");
            return;
        }

        // 其余 GET 请求（前端路由）：forward 到 index.html
        request.getRequestDispatcher("/index.html").forward(request, response);
    }
}

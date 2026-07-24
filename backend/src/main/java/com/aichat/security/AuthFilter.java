package com.aichat.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

/**
 * 简易鉴权 Filter：
 * - 白名单接口：/api/auth/** 直接放行
 * - 其余 /api/** 接口要求 Authorization: Bearer <token> 头有效
 * - 静态资源 / 非 /api 请求直接放行
 */
@Component
@Order(1)
public class AuthFilter extends OncePerRequestFilter {

    private final SessionStore sessionStore;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Set<String> AUTH_WHITELIST = Set.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/anon-bootstrap"
    );

    public AuthFilter(SessionStore sessionStore) {
        this.sessionStore = sessionStore;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // 非 API 请求（静态资源 / SPA）放行
        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        // 鉴权白名单（登录/注册）放行
        if (AUTH_WHITELIST.contains(path)) {
            chain.doFilter(request, response);
            return;
        }

        // 其余 API 需要 token
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            writeError(response, 401, "需要登录");
            return;
        }
        String token = authHeader.substring("Bearer ".length()).trim();
        String userId = sessionStore.getUserId(token);
        if (userId == null) {
            writeError(response, 401, "登录已过期，请重新登录");
            return;
        }

        try {
            UserContext.set(userId);
            chain.doFilter(request, response);
        } finally {
            UserContext.clear();
        }
    }

    private void writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        Map<String, Object> body = Map.of("error", message, "status", status);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}

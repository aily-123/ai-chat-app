package com.aichat.security;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 服务端内存会话表：token -> userId
 * - 单实例部署足够使用（每次重启会清空，需重新登录）
 * - 多实例可后续替换为 Redis
 */
@Component
public class SessionStore {

    private final Map<String, String> tokenToUserId = new ConcurrentHashMap<>();
    private final Map<String, Long> tokenToExpiry = new ConcurrentHashMap<>();

    /** 会话有效期 30 天 */
    private static final long TTL_MS = 30L * 24 * 60 * 60 * 1000;

    public String createSession(String userId) {
        String token = TokenUtil.generate();
        tokenToUserId.put(token, userId);
        tokenToExpiry.put(token, System.currentTimeMillis() + TTL_MS);
        return token;
    }

    public String getUserId(String token) {
        if (token == null) return null;
        Long expiry = tokenToExpiry.get(token);
        if (expiry == null) return null;
        if (expiry < System.currentTimeMillis()) {
            tokenToUserId.remove(token);
            tokenToExpiry.remove(token);
            return null;
        }
        return tokenToUserId.get(token);
    }

    public void invalidate(String token) {
        if (token == null) return;
        tokenToUserId.remove(token);
        tokenToExpiry.remove(token);
    }

    /** 定期清理过期 token */
    public void cleanup() {
        long now = System.currentTimeMillis();
        tokenToExpiry.entrySet().removeIf(e -> {
            if (e.getValue() < now) {
                tokenToUserId.remove(e.getKey());
                return true;
            }
            return false;
        });
    }
}

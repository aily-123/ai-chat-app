package com.aichat.security;

/**
 * 基于 ThreadLocal 的当前登录用户上下文
 * 由 AuthFilter 在请求进入时填充，业务层通过 getCurrentUserId() 获取
 */
public final class UserContext {

    private static final ThreadLocal<String> CURRENT_USER_ID = new ThreadLocal<>();

    private UserContext() {}

    public static void set(String userId) {
        CURRENT_USER_ID.set(userId);
    }

    public static String get() {
        return CURRENT_USER_ID.get();
    }

    public static String require() {
        String id = CURRENT_USER_ID.get();
        if (id == null) {
            throw new UnauthorizedException("需要登录");
        }
        return id;
    }

    public static void clear() {
        CURRENT_USER_ID.remove();
    }
}

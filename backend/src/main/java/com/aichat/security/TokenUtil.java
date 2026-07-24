package com.aichat.security;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * 简单的会话 token 生成器（基于 SecureRandom，256 bit 熵）
 * 不做 JWT，只是 token 字符串本身的随机性 + 服务端内存 map 校验
 */
public final class TokenUtil {

    private static final SecureRandom RANDOM = new SecureRandom();

    private TokenUtil() {}

    public static String generate() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}

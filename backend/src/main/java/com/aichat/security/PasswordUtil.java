package com.aichat.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 密码哈希工具：随机 salt + SHA-256
 * 格式：base64(salt) + "$" + base64(sha256(salt + ":" + password))
 */
public final class PasswordUtil {

    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordUtil() {}

    public static String hash(String password) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        return doHash(password, salt);
    }

    public static boolean verify(String password, String stored) {
        if (stored == null || !stored.contains("$")) return false;
        try {
            String[] parts = stored.split("\\$", 2);
            byte[] salt = Base64.getDecoder().decode(parts[0]);
            String expected = doHash(password, salt);
            return constantTimeEquals(expected, stored);
        } catch (Exception e) {
            return false;
        }
    }

    private static String doHash(String password, byte[] salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt);
            md.update((":" + password).getBytes(StandardCharsets.UTF_8));
            byte[] digest = md.digest();
            return Base64.getEncoder().encodeToString(salt) + "$" + Base64.getEncoder().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int r = 0;
        for (int i = 0; i < a.length(); i++) {
            r |= a.charAt(i) ^ b.charAt(i);
        }
        return r == 0;
    }
}

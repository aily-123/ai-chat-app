package com.aichat.controller;

import com.aichat.entity.UserEntity;
import com.aichat.repository.UserRepository;
import com.aichat.security.PasswordUtil;
import com.aichat.security.SessionStore;
import com.aichat.security.UserContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * 鉴权接口：注册 / 登录 / 注销 / 当前用户信息
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final SessionStore sessionStore;

    public AuthController(UserRepository userRepository, SessionStore sessionStore) {
        this.userRepository = userRepository;
        this.sessionStore = sessionStore;
    }

    /** 简易前端引导：返回"匿名 token"（仅当数据库无任何用户时自动创建 admin 账号） */
    @PostMapping("/anon-bootstrap")
    public ResponseEntity<?> anonBootstrap() {
        // 如果已经有用户了，不允许匿名 bootstrap
        if (userRepository.count() > 0) {
            return ResponseEntity.status(403).body(Map.of("error", "已存在用户，请登录或注册"));
        }
        // 创建 admin 账号
        UserEntity admin = new UserEntity();
        admin.setId(UUID.randomUUID().toString());
        admin.setUsername("admin");
        admin.setPasswordHash(PasswordUtil.hash("admin123"));
        admin.setDisplayName("Admin");
        long now = System.currentTimeMillis();
        admin.setCreatedAt(now);
        admin.setUpdatedAt(now);
        userRepository.save(admin);

        String token = sessionStore.createSession(admin.getId());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "user", Map.of(
                        "id", admin.getId(),
                        "username", admin.getUsername(),
                        "displayName", admin.getDisplayName() != null ? admin.getDisplayName() : admin.getUsername()
                ),
                "bootstrap", true
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = (body.get("username") != null ? body.get("username") : "").trim();
        String password = body.get("password") != null ? body.get("password") : "";
        String displayName = (body.get("displayName") != null ? body.get("displayName") : "").trim();

        if (username.length() < 3 || username.length() > 32) {
            return ResponseEntity.badRequest().body(Map.of("error", "用户名长度需在 3-32 字符之间"));
        }
        if (password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "密码至少 6 个字符"));
        }
        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.status(409).body(Map.of("error", "该用户名已被占用"));
        }

        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID().toString());
        user.setUsername(username);
        user.setPasswordHash(PasswordUtil.hash(password));
        user.setDisplayName(displayName.isEmpty() ? username : displayName);
        long now = System.currentTimeMillis();
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        userRepository.save(user);

        String token = sessionStore.createSession(user.getId());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "user", Map.of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "displayName", user.getDisplayName()
                )
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = (body.get("username") != null ? body.get("username") : "").trim();
        String password = body.get("password") != null ? body.get("password") : "";

        Optional<UserEntity> opt = userRepository.findByUsername(username);
        if (opt.isEmpty() || !PasswordUtil.verify(password, opt.get().getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "用户名或密码错误"));
        }
        UserEntity user = opt.get();
        String token = sessionStore.createSession(user.getId());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "user", Map.of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "displayName", user.getDisplayName() != null ? user.getDisplayName() : user.getUsername()
                )
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            sessionStore.invalidate(authHeader.substring(7).trim());
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        String userId = UserContext.require();
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "displayName", user.getDisplayName() != null ? user.getDisplayName() : user.getUsername()
        ));
    }
}

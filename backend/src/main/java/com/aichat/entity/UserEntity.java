package com.aichat.entity;

import jakarta.persistence.*;
import java.util.Objects;

/**
 * 用户表 — 实现用户隔离
 * 每个用户拥有自己的角色、对话、记忆
 */
@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(name = "uk_username", columnNames = "username")
})
public class UserEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 64)
    private String username;

    /** SHA-256 哈希（包含 salt） */
    @Column(name = "password_hash", nullable = false, length = 128)
    private String passwordHash;

    /** 显示名（可选） */
    @Column(length = 64)
    private String displayName;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "updated_at", nullable = false)
    private Long updatedAt;

    public UserEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserEntity that = (UserEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

package com.aichat.entity;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "characters")
public class CharacterEntity {

    @Id
    @Column(length = 36)
    private String id;

    /** 所属用户 ID — 用于用户隔离 */
    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String avatar;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String personality;

    @Column(columnDefinition = "TEXT")
    private String greeting;

    @Column(columnDefinition = "TEXT")
    private String examples;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(columnDefinition = "TEXT")
    private String lore;

    @Column(columnDefinition = "TEXT")
    private String background;

    @Column(name = "background_opacity")
    private Double backgroundOpacity = 0.85;

    @Column(name = "background_filter", length = 500)
    private String backgroundFilter;

    @Column(name = "background_animation", length = 50)
    private String backgroundAnimation = "none";

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "updated_at", nullable = false)
    private Long updatedAt;

    public CharacterEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getPersonality() { return personality; }
    public void setPersonality(String personality) { this.personality = personality; }
    public String getGreeting() { return greeting; }
    public void setGreeting(String greeting) { this.greeting = greeting; }
    public String getExamples() { return examples; }
    public void setExamples(String examples) { this.examples = examples; }
    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }
    public String getLore() { return lore; }
    public void setLore(String lore) { this.lore = lore; }
    public String getBackground() { return background; }
    public void setBackground(String background) { this.background = background; }
    public Double getBackgroundOpacity() { return backgroundOpacity; }
    public void setBackgroundOpacity(Double backgroundOpacity) { this.backgroundOpacity = backgroundOpacity; }
    public String getBackgroundFilter() { return backgroundFilter; }
    public void setBackgroundFilter(String backgroundFilter) { this.backgroundFilter = backgroundFilter; }
    public String getBackgroundAnimation() { return backgroundAnimation; }
    public void setBackgroundAnimation(String backgroundAnimation) { this.backgroundAnimation = backgroundAnimation; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CharacterEntity that = (CharacterEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

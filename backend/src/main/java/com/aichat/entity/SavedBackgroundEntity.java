package com.aichat.entity;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "saved_backgrounds")
public class SavedBackgroundEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String value;

    @Column(length = 50)
    private String source;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    public SavedBackgroundEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SavedBackgroundEntity that = (SavedBackgroundEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
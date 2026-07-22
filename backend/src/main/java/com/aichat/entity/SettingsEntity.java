package com.aichat.entity;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "settings")
public class SettingsEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "setting_key", nullable = false, unique = true, length = 255)
    private String settingKey;

    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String settingValue;

    public SettingsEntity() {}

    public SettingsEntity(String id, String settingKey, String settingValue) {
        this.id = id;
        this.settingKey = settingKey;
        this.settingValue = settingValue;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSettingKey() { return settingKey; }
    public void setSettingKey(String settingKey) { this.settingKey = settingKey; }
    public String getSettingValue() { return settingValue; }
    public void setSettingValue(String settingValue) { this.settingValue = settingValue; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SettingsEntity that = (SettingsEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
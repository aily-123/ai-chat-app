package com.aichat.service;

import com.aichat.entity.SettingsEntity;
import com.aichat.repository.SettingsRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SettingsService {

    private final SettingsRepository settingsRepository;

    public SettingsService(SettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    public Map<String, String> getAll() {
        List<SettingsEntity> all = settingsRepository.findAll();
        Map<String, String> result = new LinkedHashMap<>();
        for (SettingsEntity s : all) {
            result.put(s.getSettingKey(), s.getSettingValue());
        }
        return result;
    }

    public Optional<String> get(String key) {
        return settingsRepository.findBySettingKey(key).map(SettingsEntity::getSettingValue);
    }

    public void set(String key, String value) {
        SettingsEntity entity = settingsRepository.findBySettingKey(key)
                .orElse(new SettingsEntity(UUID.randomUUID().toString(), key, value));
        entity.setSettingValue(value);
        settingsRepository.save(entity);
    }

    public void setAll(Map<String, String> settings) {
        for (Map.Entry<String, String> entry : settings.entrySet()) {
            set(entry.getKey(), entry.getValue());
        }
    }
}
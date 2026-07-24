package com.aichat.service;

import com.aichat.entity.SettingsEntity;
import com.aichat.repository.SettingsRepository;
import com.aichat.security.UserContext;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SettingsService {

    private final SettingsRepository settingsRepository;

    public SettingsService(SettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    /** 仅返回当前用户的设置 */
    public Map<String, String> getAll() {
        String userId = UserContext.require();
        List<SettingsEntity> all = settingsRepository.findByUserId(userId);
        Map<String, String> result = new LinkedHashMap<>();
        for (SettingsEntity s : all) {
            result.put(s.getSettingKey(), s.getSettingValue());
        }
        return result;
    }

    public Optional<String> get(String key) {
        String userId = UserContext.require();
        return settingsRepository.findByUserIdAndSettingKey(userId, key)
                .map(SettingsEntity::getSettingValue);
    }

    public void set(String key, String value) {
        String userId = UserContext.require();
        SettingsEntity entity = settingsRepository
                .findByUserIdAndSettingKey(userId, key)
                .orElse(new SettingsEntity(UUID.randomUUID().toString(), userId, key, value));
        entity.setSettingValue(value);
        settingsRepository.save(entity);
    }

    public void setAll(Map<String, String> settings) {
        for (Map.Entry<String, String> entry : settings.entrySet()) {
            set(entry.getKey(), entry.getValue());
        }
    }
}

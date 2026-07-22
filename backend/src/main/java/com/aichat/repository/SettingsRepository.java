package com.aichat.repository;

import com.aichat.entity.SettingsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SettingsRepository extends JpaRepository<SettingsEntity, String> {
    Optional<SettingsEntity> findBySettingKey(String settingKey);
}
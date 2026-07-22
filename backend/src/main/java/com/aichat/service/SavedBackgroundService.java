package com.aichat.service;

import com.aichat.entity.SavedBackgroundEntity;
import com.aichat.repository.SavedBackgroundRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class SavedBackgroundService {

    private final SavedBackgroundRepository savedBackgroundRepository;

    public SavedBackgroundService(SavedBackgroundRepository savedBackgroundRepository) {
        this.savedBackgroundRepository = savedBackgroundRepository;
    }

    public List<SavedBackgroundEntity> getAll() {
        return savedBackgroundRepository.findAllByOrderByCreatedAtDesc();
    }

    public SavedBackgroundEntity add(SavedBackgroundEntity bg) {
        bg.setId(UUID.randomUUID().toString());
        if (bg.getCreatedAt() == null) bg.setCreatedAt(System.currentTimeMillis());
        return savedBackgroundRepository.save(bg);
    }

    public boolean remove(String id) {
        if (savedBackgroundRepository.existsById(id)) {
            savedBackgroundRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
package com.aichat.service;

import com.aichat.entity.SavedBackgroundEntity;
import com.aichat.repository.SavedBackgroundRepository;
import com.aichat.security.UserContext;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class SavedBackgroundService {

    private final SavedBackgroundRepository savedBackgroundRepository;

    public SavedBackgroundService(SavedBackgroundRepository savedBackgroundRepository) {
        this.savedBackgroundRepository = savedBackgroundRepository;
    }

    public List<SavedBackgroundEntity> getAll() {
        String userId = UserContext.require();
        return savedBackgroundRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public SavedBackgroundEntity add(SavedBackgroundEntity bg) {
        bg.setUserId(UserContext.require());
        bg.setId(UUID.randomUUID().toString());
        if (bg.getCreatedAt() == null) bg.setCreatedAt(System.currentTimeMillis());
        return savedBackgroundRepository.save(bg);
    }

    public boolean remove(String id) {
        String userId = UserContext.require();
        Optional<SavedBackgroundEntity> existing = savedBackgroundRepository.findById(id);
        if (existing.isPresent() && userId.equals(existing.get().getUserId())) {
            savedBackgroundRepository.deleteById(id);
            return true;
        }
        return false;
    }
}

package com.aichat.service;

import com.aichat.entity.ConversationEntity;
import com.aichat.repository.ConversationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;

    public ConversationService(ConversationRepository conversationRepository) {
        this.conversationRepository = conversationRepository;
    }

    public List<ConversationEntity> getAll() {
        return conversationRepository.findAll();
    }

    public Optional<ConversationEntity> getById(String id) {
        return conversationRepository.findById(id);
    }

    public ConversationEntity create(ConversationEntity conversation) {
        conversation.setId(UUID.randomUUID().toString());
        long now = System.currentTimeMillis();
        if (conversation.getCreatedAt() == null) conversation.setCreatedAt(now);
        if (conversation.getUpdatedAt() == null) conversation.setUpdatedAt(now);
        return conversationRepository.save(conversation);
    }

    public Optional<ConversationEntity> update(String id, ConversationEntity updates) {
        return conversationRepository.findById(id).map(existing -> {
            if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
            if (updates.getModel() != null) existing.setModel(updates.getModel());
            if (updates.getSystemPrompt() != null) existing.setSystemPrompt(updates.getSystemPrompt());
            if (updates.getCharacterId() != null) existing.setCharacterId(updates.getCharacterId());
            if (updates.getBackground() != null) existing.setBackground(updates.getBackground());
            if (updates.getBackgroundOpacity() != null) existing.setBackgroundOpacity(updates.getBackgroundOpacity());
            if (updates.getBackgroundFilter() != null) existing.setBackgroundFilter(updates.getBackgroundFilter());
            if (updates.getBackgroundAnimation() != null) existing.setBackgroundAnimation(updates.getBackgroundAnimation());
            if (updates.getPlotMode() != null) existing.setPlotMode(updates.getPlotMode());
            if (updates.getPlotSetting() != null) existing.setPlotSetting(updates.getPlotSetting());
            if (updates.getPlotProgress() != null) existing.setPlotProgress(updates.getPlotProgress());
            if (updates.getMemorySummary() != null) existing.setMemorySummary(updates.getMemorySummary());
            if (updates.getMemorySummaryUpTo() != null) existing.setMemorySummaryUpTo(updates.getMemorySummaryUpTo());
            if (updates.getMemoryFacts() != null) existing.setMemoryFacts(updates.getMemoryFacts());
            existing.setUpdatedAt(System.currentTimeMillis());
            return conversationRepository.save(existing);
        });
    }

    public boolean delete(String id) {
        if (conversationRepository.existsById(id)) {
            conversationRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
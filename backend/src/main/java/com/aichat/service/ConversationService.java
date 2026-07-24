package com.aichat.service;

import com.aichat.entity.ConversationEntity;
import com.aichat.repository.ConversationRepository;
import com.aichat.repository.MessageRepository;
import com.aichat.security.UserContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    public ConversationService(ConversationRepository conversationRepository, MessageRepository messageRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    /** 仅返回当前用户的对话（按更新时间倒序） */
    public List<ConversationEntity> getAll() {
        String userId = UserContext.require();
        return conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public Optional<ConversationEntity> getById(String id) {
        String userId = UserContext.require();
        return conversationRepository.findByIdAndUserId(id, userId);
    }

    public ConversationEntity create(ConversationEntity conversation) {
        // 自动注入当前用户 ID
        conversation.setUserId(UserContext.require());
        conversation.setId(UUID.randomUUID().toString());
        long now = System.currentTimeMillis();
        if (conversation.getCreatedAt() == null) conversation.setCreatedAt(now);
        if (conversation.getUpdatedAt() == null) conversation.setUpdatedAt(now);
        return conversationRepository.save(conversation);
    }

    public Optional<ConversationEntity> update(String id, ConversationEntity updates) {
        String userId = UserContext.require();
        return conversationRepository.findByIdAndUserId(id, userId).map(existing -> {
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
            if (updates.getWorldBook() != null) existing.setWorldBook(updates.getWorldBook());
            if (updates.getCharacterStatus() != null) existing.setCharacterStatus(updates.getCharacterStatus());
            if (updates.getMemoryCheckpointMsgId() != null) existing.setMemoryCheckpointMsgId(updates.getMemoryCheckpointMsgId());
            if (updates.getMemorySummary() != null) existing.setMemorySummary(updates.getMemorySummary());
            if (updates.getMemorySummaryUpTo() != null) existing.setMemorySummaryUpTo(updates.getMemorySummaryUpTo());
            if (updates.getMemoryFacts() != null) existing.setMemoryFacts(updates.getMemoryFacts());
            existing.setUpdatedAt(System.currentTimeMillis());
            return conversationRepository.save(existing);
        });
    }

    @Transactional
    public boolean delete(String id) {
        String userId = UserContext.require();
        Optional<ConversationEntity> existing = conversationRepository.findByIdAndUserId(id, userId);
        if (existing.isPresent()) {
            // 同步删除对话下的所有消息
            messageRepository.deleteByConversationId(id);
            conversationRepository.deleteById(id);
            return true;
        }
        return false;
    }

    /** 校验当前用户是否拥有该对话 */
    public boolean verifyOwnership(String conversationId) {
        String userId = UserContext.require();
        return conversationRepository.findByIdAndUserId(conversationId, userId).isPresent();
    }
}

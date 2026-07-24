package com.aichat.service;

import com.aichat.entity.MessageEntity;
import com.aichat.repository.ConversationRepository;
import com.aichat.repository.MessageRepository;
import com.aichat.security.UserContext;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;

    public MessageService(MessageRepository messageRepository, ConversationRepository conversationRepository) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
    }

    private void verifyOwnership(String conversationId) {
        String userId = UserContext.require();
        if (conversationRepository.findByIdAndUserId(conversationId, userId).isEmpty()) {
            throw new SecurityException("无权访问该对话");
        }
    }

    public List<MessageEntity> getAll(String conversationId) {
        verifyOwnership(conversationId);
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    public List<MessageEntity> getActiveChain(String conversationId) {
        verifyOwnership(conversationId);
        return messageRepository.findByConversationIdAndIsActiveVersionTrueOrderByCreatedAtAsc(conversationId);
    }

    public MessageEntity create(String conversationId, MessageEntity message) {
        verifyOwnership(conversationId);
        message.setConversationId(conversationId);
        message.setId(UUID.randomUUID().toString());
        if (message.getCreatedAt() == null) message.setCreatedAt(System.currentTimeMillis());
        if (message.getParentMessageId() == null) message.setParentMessageId(null);
        if (message.getVersion() == null) message.setVersion(1);
        if (message.getIsActiveVersion() == null) message.setIsActiveVersion(true);
        return messageRepository.save(message);
    }

    public Optional<MessageEntity> setActiveVersion(String conversationId, String messageId) {
        verifyOwnership(conversationId);
        Optional<MessageEntity> target = messageRepository.findById(messageId);
        if (target.isPresent()) {
            messageRepository.setActiveVersion(messageId);
            return target;
        }
        return Optional.empty();
    }

    public boolean deleteById(String conversationId, String messageId) {
        verifyOwnership(conversationId);
        if (messageRepository.existsById(messageId)) {
            messageRepository.deleteById(messageId);
            return true;
        }
        return false;
    }

    public int deactivateAfter(String conversationId, Long timestamp) {
        verifyOwnership(conversationId);
        return messageRepository.deactivateAfter(conversationId, timestamp);
    }

    public int deleteAfter(String conversationId, Long timestamp) {
        verifyOwnership(conversationId);
        List<MessageEntity> all = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        long count = all.stream().filter(m -> m.getCreatedAt() > timestamp).count();
        messageRepository.deleteByConversationIdAndCreatedAtGreaterThan(conversationId, timestamp);
        return (int) count;
    }

    /**
     * 从指定消息开始回溯（包含该消息本身）：
     * - 物理删除该消息及之后的所有消息
     * - 用于"清空式回溯"（剧情模式用户消息回溯 / AI 消息重新生成）
     */
    public int deleteFromMessage(String conversationId, String messageId) {
        verifyOwnership(conversationId);
        Optional<MessageEntity> target = messageRepository.findById(messageId);
        if (target.isPresent()) {
            return messageRepository.deleteFromTimestamp(conversationId, target.get().getCreatedAt());
        }
        return 0;
    }

    public boolean deleteAll(String conversationId) {
        verifyOwnership(conversationId);
        messageRepository.deleteByConversationId(conversationId);
        return true;
    }
}

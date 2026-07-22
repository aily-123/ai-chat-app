package com.aichat.service;

import com.aichat.entity.MessageEntity;
import com.aichat.repository.MessageRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MessageService {

    private final MessageRepository messageRepository;

    public MessageService(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    public List<MessageEntity> getAll(String conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    public List<MessageEntity> getActiveChain(String conversationId) {
        return messageRepository.findByConversationIdAndIsActiveVersionTrueOrderByCreatedAtAsc(conversationId);
    }

    public MessageEntity create(MessageEntity message) {
        message.setId(UUID.randomUUID().toString());
        if (message.getCreatedAt() == null) message.setCreatedAt(System.currentTimeMillis());
        return messageRepository.save(message);
    }

    public Optional<MessageEntity> setActiveVersion(String conversationId, String messageId) {
        Optional<MessageEntity> target = messageRepository.findById(messageId);
        if (target.isPresent()) {
            messageRepository.setActiveVersion(messageId);
            return target;
        }
        return Optional.empty();
    }

    public boolean deleteById(String conversationId, String messageId) {
        if (messageRepository.existsById(messageId)) {
            messageRepository.deleteById(messageId);
            return true;
        }
        return false;
    }

    public int deactivateAfter(String conversationId, Long timestamp) {
        return messageRepository.deactivateAfter(conversationId, timestamp);
    }

    public int deleteAfter(String conversationId, Long timestamp) {
        List<MessageEntity> all = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        long count = all.stream().filter(m -> m.getCreatedAt() > timestamp).count();
        messageRepository.deleteByConversationIdAndCreatedAtGreaterThan(conversationId, timestamp);
        return (int) count;
    }

    public int deleteFromMessage(String conversationId, String messageId) {
        Optional<MessageEntity> target = messageRepository.findById(messageId);
        if (target.isPresent()) {
            return messageRepository.deleteFromTimestamp(conversationId, target.get().getCreatedAt());
        }
        return 0;
    }

    public boolean deleteAll(String conversationId) {
        messageRepository.deleteByConversationId(conversationId);
        return true;
    }
}
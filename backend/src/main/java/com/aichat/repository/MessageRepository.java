package com.aichat.repository;

import com.aichat.entity.MessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<MessageEntity, String> {

    List<MessageEntity> findByConversationIdOrderByCreatedAtAsc(String conversationId);

    List<MessageEntity> findByConversationIdAndIsActiveVersionTrueOrderByCreatedAtAsc(String conversationId);

    @Modifying
    @Transactional
    @Query("UPDATE MessageEntity m SET m.isActiveVersion = false WHERE m.conversationId = :convId AND m.createdAt > :timestamp AND m.isActiveVersion = true")
    int deactivateAfter(@Param("convId") String conversationId, @Param("timestamp") Long timestamp);

    @Modifying
    @Transactional
    void deleteByConversationIdAndCreatedAtGreaterThan(String conversationId, Long timestamp);

    @Modifying
    @Transactional
    @Query("DELETE FROM MessageEntity m WHERE m.conversationId = :convId AND m.createdAt >= :timestamp")
    int deleteFromTimestamp(@Param("convId") String conversationId, @Param("timestamp") Long timestamp);

    @Modifying
    @Transactional
    void deleteByConversationId(String conversationId);

    @Modifying
    @Transactional
    @Query("UPDATE MessageEntity m SET m.isActiveVersion = (m.id = :msgId) WHERE m.parentMessageId = (SELECT m2.parentMessageId FROM MessageEntity m2 WHERE m2.id = :msgId) AND m.role = 'assistant'")
    int setActiveVersion(@Param("msgId") String messageId);
}
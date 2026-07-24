package com.aichat.repository;

import com.aichat.entity.ConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<ConversationEntity, String> {
    List<ConversationEntity> findByUserIdOrderByUpdatedAtDesc(String userId);
    Optional<ConversationEntity> findByIdAndUserId(String id, String userId);
}

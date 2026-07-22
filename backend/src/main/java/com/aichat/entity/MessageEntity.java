package com.aichat.entity;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "messages")
public class MessageEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "conversation_id", nullable = false, length = 36)
    private String conversationId;

    @Column(nullable = false, length = 20)
    private String role;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column
    private Integer tokens = 0;

    @Column(name = "parent_message_id", length = 36)
    private String parentMessageId;

    @Column
    private Integer version = 1;

    @Column(name = "is_active_version")
    private Boolean isActiveVersion = true;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    public MessageEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Integer getTokens() { return tokens; }
    public void setTokens(Integer tokens) { this.tokens = tokens; }
    public String getParentMessageId() { return parentMessageId; }
    public void setParentMessageId(String parentMessageId) { this.parentMessageId = parentMessageId; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
    public Boolean getIsActiveVersion() { return isActiveVersion; }
    public void setIsActiveVersion(Boolean isActiveVersion) { this.isActiveVersion = isActiveVersion; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        MessageEntity that = (MessageEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
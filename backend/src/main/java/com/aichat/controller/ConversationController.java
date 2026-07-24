package com.aichat.controller;

import com.aichat.entity.ConversationEntity;
import com.aichat.service.ConversationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @GetMapping
    public List<ConversationEntity> getAll() {
        return conversationService.getAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationEntity> getById(@PathVariable String id) {
        return conversationService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ConversationEntity create(@RequestBody ConversationEntity conversation) {
        return conversationService.create(conversation);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ConversationEntity> update(@PathVariable String id, @RequestBody ConversationEntity updates) {
        return conversationService.update(id, updates)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return conversationService.delete(id)
                ? ResponseEntity.ok().build()
                : ResponseEntity.notFound().build();
    }

    /**
     * 重置对话：清空所有消息 + 清空 AI 记忆，保留对话本身和剧情设定
     */
    @PostMapping("/{id}/reset")
    public ResponseEntity<ConversationEntity> reset(@PathVariable String id) {
        return conversationService.reset(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
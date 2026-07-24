package com.aichat.controller;

import com.aichat.entity.MessageEntity;
import com.aichat.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations/{conversationId}/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping
    public List<MessageEntity> getAll(@PathVariable String conversationId) {
        return messageService.getAll(conversationId);
    }

    @GetMapping("/active")
    public List<MessageEntity> getActiveChain(@PathVariable String conversationId) {
        return messageService.getActiveChain(conversationId);
    }

    @PostMapping
    public MessageEntity create(@PathVariable String conversationId, @RequestBody MessageEntity message) {
        return messageService.create(conversationId, message);
    }

    @PutMapping("/{messageId}/active-version")
    public ResponseEntity<MessageEntity> setActiveVersion(
            @PathVariable String conversationId, @PathVariable String messageId) {
        return messageService.setActiveVersion(conversationId, messageId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteById(
            @PathVariable String conversationId, @PathVariable String messageId) {
        return messageService.deleteById(conversationId, messageId)
                ? ResponseEntity.ok().build()
                : ResponseEntity.notFound().build();
    }

    @PostMapping("/deactivate-after")
    public ResponseEntity<Integer> deactivateAfter(
            @PathVariable String conversationId, @RequestBody Map<String, Long> body) {
        Long timestamp = body.get("timestamp");
        if (timestamp == null) return ResponseEntity.badRequest().build();
        int count = messageService.deactivateAfter(conversationId, timestamp);
        return ResponseEntity.ok(count);
    }

    @PostMapping("/delete-after")
    public ResponseEntity<Integer> deleteAfter(
            @PathVariable String conversationId, @RequestBody Map<String, Long> body) {
        Long timestamp = body.get("timestamp");
        if (timestamp == null) return ResponseEntity.badRequest().build();
        int count = messageService.deleteAfter(conversationId, timestamp);
        return ResponseEntity.ok(count);
    }

    @PostMapping("/delete-from")
    public ResponseEntity<Integer> deleteFromMessage(
            @PathVariable String conversationId, @RequestBody Map<String, String> body) {
        String messageId = body.get("messageId");
        if (messageId == null) return ResponseEntity.badRequest().build();
        int count = messageService.deleteFromMessage(conversationId, messageId);
        return ResponseEntity.ok(count);
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAll(@PathVariable String conversationId) {
        messageService.deleteAll(conversationId);
        return ResponseEntity.ok().build();
    }
}

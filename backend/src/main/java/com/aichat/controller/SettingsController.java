package com.aichat.controller;

import com.aichat.service.SettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public Map<String, String> getAll() {
        return settingsService.getAll();
    }

    @GetMapping("/{key}")
    public ResponseEntity<String> get(@PathVariable String key) {
        return settingsService.get(key)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping
    public ResponseEntity<Void> setAll(@RequestBody Map<String, String> settings) {
        settingsService.setAll(settings);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{key}")
    public ResponseEntity<Void> set(@PathVariable String key, @RequestBody Map<String, String> body) {
        String value = body.get("value");
        if (value == null) return ResponseEntity.badRequest().build();
        settingsService.set(key, value);
        return ResponseEntity.ok().build();
    }
}
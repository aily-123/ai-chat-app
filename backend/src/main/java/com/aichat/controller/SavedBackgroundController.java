package com.aichat.controller;

import com.aichat.entity.SavedBackgroundEntity;
import com.aichat.service.SavedBackgroundService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/saved-backgrounds")
public class SavedBackgroundController {

    private final SavedBackgroundService savedBackgroundService;

    public SavedBackgroundController(SavedBackgroundService savedBackgroundService) {
        this.savedBackgroundService = savedBackgroundService;
    }

    @GetMapping
    public List<SavedBackgroundEntity> getAll() {
        return savedBackgroundService.getAll();
    }

    @PostMapping
    public SavedBackgroundEntity add(@RequestBody SavedBackgroundEntity bg) {
        return savedBackgroundService.add(bg);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remove(@PathVariable String id) {
        return savedBackgroundService.remove(id)
                ? ResponseEntity.ok().build()
                : ResponseEntity.notFound().build();
    }
}
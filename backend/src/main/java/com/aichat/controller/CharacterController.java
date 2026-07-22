package com.aichat.controller;

import com.aichat.entity.CharacterEntity;
import com.aichat.service.CharacterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/characters")
public class CharacterController {

    private final CharacterService characterService;

    public CharacterController(CharacterService characterService) {
        this.characterService = characterService;
    }

    @GetMapping
    public List<CharacterEntity> getAll() {
        return characterService.getAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CharacterEntity> getById(@PathVariable String id) {
        return characterService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public CharacterEntity create(@RequestBody CharacterEntity character) {
        return characterService.create(character);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CharacterEntity> update(@PathVariable String id, @RequestBody CharacterEntity updates) {
        return characterService.update(id, updates)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return characterService.delete(id)
                ? ResponseEntity.ok().build()
                : ResponseEntity.notFound().build();
    }
}
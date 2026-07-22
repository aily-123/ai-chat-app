package com.aichat.service;

import com.aichat.entity.CharacterEntity;
import com.aichat.repository.CharacterRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CharacterService {

    private final CharacterRepository characterRepository;

    public CharacterService(CharacterRepository characterRepository) {
        this.characterRepository = characterRepository;
    }

    public List<CharacterEntity> getAll() {
        return characterRepository.findAll();
    }

    public Optional<CharacterEntity> getById(String id) {
        return characterRepository.findById(id);
    }

    public CharacterEntity create(CharacterEntity character) {
        character.setId(UUID.randomUUID().toString());
        long now = System.currentTimeMillis();
        if (character.getCreatedAt() == null) character.setCreatedAt(now);
        if (character.getUpdatedAt() == null) character.setUpdatedAt(now);
        return characterRepository.save(character);
    }

    public Optional<CharacterEntity> update(String id, CharacterEntity updates) {
        return characterRepository.findById(id).map(existing -> {
            if (updates.getName() != null) existing.setName(updates.getName());
            if (updates.getAvatar() != null) existing.setAvatar(updates.getAvatar());
            if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
            if (updates.getPersonality() != null) existing.setPersonality(updates.getPersonality());
            if (updates.getGreeting() != null) existing.setGreeting(updates.getGreeting());
            if (updates.getExamples() != null) existing.setExamples(updates.getExamples());
            if (updates.getInstructions() != null) existing.setInstructions(updates.getInstructions());
            if (updates.getLore() != null) existing.setLore(updates.getLore());
            if (updates.getBackground() != null) existing.setBackground(updates.getBackground());
            if (updates.getBackgroundOpacity() != null) existing.setBackgroundOpacity(updates.getBackgroundOpacity());
            if (updates.getBackgroundFilter() != null) existing.setBackgroundFilter(updates.getBackgroundFilter());
            if (updates.getBackgroundAnimation() != null) existing.setBackgroundAnimation(updates.getBackgroundAnimation());
            existing.setUpdatedAt(System.currentTimeMillis());
            return characterRepository.save(existing);
        });
    }

    public boolean delete(String id) {
        if (characterRepository.existsById(id)) {
            characterRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
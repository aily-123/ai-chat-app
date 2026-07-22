package com.aichat.repository;

import com.aichat.entity.SavedBackgroundEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedBackgroundRepository extends JpaRepository<SavedBackgroundEntity, String> {
    List<SavedBackgroundEntity> findAllByOrderByCreatedAtDesc();
}
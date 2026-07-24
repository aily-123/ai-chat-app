package com.aichat.entity;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "conversations")
public class ConversationEntity {

    @Id
    @Column(length = 36)
    private String id;

    /** 所属用户 ID — 用于用户隔离 */
    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(length = 255)
    private String title = "新对话";

    @Column(length = 50)
    private String model = "gpt-4o";

    @Column(name = "system_prompt", columnDefinition = "TEXT")
    private String systemPrompt;

    @Column(name = "character_id", length = 36)
    private String characterId;

    @Column(columnDefinition = "TEXT")
    private String background;

    @Column(name = "background_opacity")
    private Double backgroundOpacity = 0.85;

    @Column(name = "background_filter", length = 500)
    private String backgroundFilter;

    @Column(name = "background_animation", length = 50)
    private String backgroundAnimation = "none";

    @Column(name = "plot_mode")
    private Boolean plotMode = false;

    @Column(name = "plot_setting", columnDefinition = "TEXT")
    private String plotSetting;

    @Column(name = "plot_progress", columnDefinition = "TEXT")
    private String plotProgress;

    /** 世界书（剧情模式下生效，可包含多条独立词条） */
    @Column(name = "world_book", columnDefinition = "TEXT")
    private String worldBook;

    /** 剧情人物状态（JSON 或纯文本：人物、地点、物品、关系） */
    @Column(name = "character_status", columnDefinition = "TEXT")
    private String characterStatus;

    /** 上次自动保存的记忆点（消息 ID），回溯到此消息之前时记忆重置 */
    @Column(name = "memory_checkpoint_msg_id", length = 36)
    private String memoryCheckpointMsgId;

    @Column(name = "memory_summary", columnDefinition = "TEXT")
    private String memorySummary;

    @Column(name = "memory_summary_up_to")
    private Integer memorySummaryUpTo = 0;

    @Column(name = "memory_facts", columnDefinition = "TEXT")
    private String memoryFacts;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "updated_at", nullable = false)
    private Long updatedAt;

    public ConversationEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getSystemPrompt() { return systemPrompt; }
    public void setSystemPrompt(String systemPrompt) { this.systemPrompt = systemPrompt; }
    public String getCharacterId() { return characterId; }
    public void setCharacterId(String characterId) { this.characterId = characterId; }
    public String getBackground() { return background; }
    public void setBackground(String background) { this.background = background; }
    public Double getBackgroundOpacity() { return backgroundOpacity; }
    public void setBackgroundOpacity(Double backgroundOpacity) { this.backgroundOpacity = backgroundOpacity; }
    public String getBackgroundFilter() { return backgroundFilter; }
    public void setBackgroundFilter(String backgroundFilter) { this.backgroundFilter = backgroundFilter; }
    public String getBackgroundAnimation() { return backgroundAnimation; }
    public void setBackgroundAnimation(String backgroundAnimation) { this.backgroundAnimation = backgroundAnimation; }
    public Boolean getPlotMode() { return plotMode; }
    public void setPlotMode(Boolean plotMode) { this.plotMode = plotMode; }
    public String getPlotSetting() { return plotSetting; }
    public void setPlotSetting(String plotSetting) { this.plotSetting = plotSetting; }
    public String getPlotProgress() { return plotProgress; }
    public void setPlotProgress(String plotProgress) { this.plotProgress = plotProgress; }
    public String getWorldBook() { return worldBook; }
    public void setWorldBook(String worldBook) { this.worldBook = worldBook; }
    public String getCharacterStatus() { return characterStatus; }
    public void setCharacterStatus(String characterStatus) { this.characterStatus = characterStatus; }
    public String getMemoryCheckpointMsgId() { return memoryCheckpointMsgId; }
    public void setMemoryCheckpointMsgId(String memoryCheckpointMsgId) { this.memoryCheckpointMsgId = memoryCheckpointMsgId; }
    public String getMemorySummary() { return memorySummary; }
    public void setMemorySummary(String memorySummary) { this.memorySummary = memorySummary; }
    public Integer getMemorySummaryUpTo() { return memorySummaryUpTo; }
    public void setMemorySummaryUpTo(Integer memorySummaryUpTo) { this.memorySummaryUpTo = memorySummaryUpTo; }
    public String getMemoryFacts() { return memoryFacts; }
    public void setMemoryFacts(String memoryFacts) { this.memoryFacts = memoryFacts; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ConversationEntity that = (ConversationEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

package com.aichat.config;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Controller
public class SpaConfig {

    @GetMapping(value = {"/", "/{path:[^.]+}", "/{path:[^.]+}/**"})
    public ResponseEntity<String> serveIndex() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/index.html");
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        try (InputStream is = resource.getInputStream()) {
            String content = StreamUtils.copyToString(is, StandardCharsets.UTF_8);
            return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(content);
        }
    }
}
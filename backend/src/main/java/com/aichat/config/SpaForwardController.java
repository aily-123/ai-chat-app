package com.aichat.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * SPA 路由 fallback：将非 API、非静态资源的请求转发到 index.html
 */
@Controller
public class SpaForwardController {

    /**
     * 匹配所有不含 "." 的路径（非静态资源），转发到 index.html
     * API 路径 /api/** 由 REST Controller 处理，不会进入此映射
     */
    @RequestMapping(value = "/{path:[^\\.]*}")
    public String forward() {
        return "forward:/index.html";
    }
}
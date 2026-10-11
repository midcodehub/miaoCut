/**
 * Umami 上报过滤器（省额度用）
 * ============================================================
 * 背景：
 *   Umami Cloud 免费档按「事件数」计费 —— pageview 和 umami.track() 自定义事件都算 1 次。
 *   之前每个用户每处理一张图都会上报 upload-started + cutout-success + transparent-download
 *   等多条事件，重度用户一个会话能刷几十条，导致额度 ~8 天就用光。
 *
 * 原理：
 *   Umami 追踪脚本支持 <script data-before-send="函数名">：每次发送前都会调用
 *   window[函数名](type, payload)，返回 payload 就照常发送，返回 false/null 就丢弃。
 *   （源码：cloud.umami.is/script.js 里 `const n=t[k]; ... e=await n(a,e); if(e) fetch(...)`）
 *   所以这里集中做过滤，各页面里的 track('xxx') / umami.track('xxx') 调用都不用改。
 *
 * 过滤规则（按顺序）：
 *   1. 会话级抽样：SAMPLE_RATE < 1 时，整个标签页会话要么全报、要么全不报，
 *      保证同一用户的「浏览 → 上传 → 成功 → 下载」漏斗是完整的。默认 1 = 不抽样。
 *   2. 黑名单事件：冗余或高频低价值事件直接丢弃（见 DROP_EVENTS 注释）。
 *   3. 自定义事件按「事件名」每个会话只报 1 次：
 *      Umami 看板里事件数从「总次数」变成「做过这件事的会话数」，
 *      转化率分析（多少访客成功抠图 / 下载）反而更准；处理总量请看后端日志。
 *   4. pageview 按「URL」每个会话只报 1 次：刷新、来回切页不重复计数。
 *
 * 「会话」= 浏览器标签页的 sessionStorage 生命周期（关标签页即结束）。
 * sessionStorage 不可用（隐私模式 / 被禁用）时退化为当前页内存去重，不会报错。
 *
 * ⚠️ 这个文件被 /zh/ 等多语言页面共用，路径已加进 scripts/build-i18n.mjs 的
 *    ASSET_PATH_PREFIXES，不会被改写成 /zh/umami-filter.js。
 */
(function () {
    'use strict';

    // ---------- 可调参数 ----------

    // 会话抽样率（0~1）。额度仍不够时再调低，例如 0.5 = 只统计一半会话；
    // 届时看板上的 PV / 访客 / 事件数都要 ÷ SAMPLE_RATE 才是真实量级。
    var SAMPLE_RATE = 1;

    // 直接丢弃的自定义事件
    var DROP_EVENTS = {
        // 上传开始：必然紧跟 cutout-success / cutout-failed / cutout-rate-limited 之一，
        // 结果事件已能推出上传量，单独上报纯属重复
        'upload-started': true,
        // PNG→JPG 页每点一次色块就报一次，高频但几乎没有分析价值
        'bg-color-change': true
    };

    // sessionStorage key 前缀，避免和业务 key 冲突
    var KEY_PREFIX = 'mc_umami:';

    // ---------- 存储（带降级） ----------

    var memory = {}; // sessionStorage 不可用时的页内兜底

    function seen(key) {
        try {
            if (window.sessionStorage.getItem(KEY_PREFIX + key) !== null) return true;
        } catch (_) { /* 降级到内存 */ }
        return memory[key] === true;
    }

    function mark(key, value) {
        memory[key] = true;
        try {
            window.sessionStorage.setItem(KEY_PREFIX + key, value || '1');
        } catch (_) { /* 降级到内存，已写入 memory */ }
    }

    // 会话是否被抽中：首次决定后写入 sessionStorage，同一标签页内保持一致
    function inSample() {
        if (SAMPLE_RATE >= 1) return true;
        var key = KEY_PREFIX + 'sampled';
        try {
            var v = window.sessionStorage.getItem(key);
            if (v === null) {
                v = Math.random() < SAMPLE_RATE ? '1' : '0';
                window.sessionStorage.setItem(key, v);
            }
            return v === '1';
        } catch (_) {
            return Math.random() < SAMPLE_RATE;
        }
    }

    // ---------- Umami 回调 ----------

    /**
     * @param {string} type    'event'（pageview 和自定义事件都是这个）| 'identify' | 'performance'
     * @param {object} payload Umami 组装好的数据；自定义事件带 name，pageview 没有 name
     * @returns {object|false} 返回 payload 发送，false 丢弃
     */
    window.miaocutUmamiBeforeSend = function (type, payload) {
        try {
            if (!payload) return payload;
            // 只管 event；identify / performance 本站没开，原样放行
            if (type !== 'event') return payload;

            if (!inSample()) return false;

            if (payload.name) {
                // 自定义事件
                if (DROP_EVENTS[payload.name]) return false;
                var eventKey = 'e:' + payload.name;
                if (seen(eventKey)) return false;
                mark(eventKey);
                return payload;
            }

            // pageview：同一 URL 本会话只报一次
            var viewKey = 'v:' + (payload.url || location.pathname);
            if (seen(viewKey)) return false;
            mark(viewKey);
            return payload;
        } catch (_) {
            // 过滤逻辑自身出错时宁可照常上报，也不要把统计整个弄丢
            return payload;
        }
    };
})();

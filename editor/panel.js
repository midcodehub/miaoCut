/**
 * MiaoCut 后处理编辑器 —— 操作面板（UI）
 * ============================================================
 * 职责：生成编辑器界面（预览 + 背景 / 阴影 / 画幅 / 导出四组控件），把用户操作写进
 * EditorState，再调用 engine.js 重绘。绘制细节全在引擎里，这里只管「状态 ↔ 界面」。
 *
 * 依赖：先加载 presets.js、engine.js。文案翻译 t() 和埋点 track() 由 app.js 传入，
 *       面板自己不持有任何 i18n 字典（统一走 app.js 的 BASE_I18N，8 种语言都在那里）。
 *
 * 渲染节奏（保证拖滑块流畅，benchmark 见 engine.js renderPreview 注释）：
 *   - 拖动中（range 的 input 事件 / 拖拽主体）：scheduleRender(true) → 按 dpr=1 快速出图
 *   - 松手（change / pointerup）：scheduleRender(false) → 补一帧 Retina 高清
 *   - 同一帧内多次请求合并成一次（requestAnimationFrame）
 *
 * ⚠️ Tailwind 会扫描本文件（见 tailwind.config.js content），class 名必须以完整字符串出现，
 *    不要用字符串拼接生成 class（例如 'bg-' + color），否则 build:css 不会生成对应样式。
 */
(function (root) {
    'use strict';

    const presets = root.MiaoCutEditor.presets;

    // ------------------------------------------------------------
    // 样式常量（与站点现有「快速 / 细腻」质量切换按钮保持一致：选中黑底白字）
    // ------------------------------------------------------------
    const HEAD = 'mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400';
    const SUBHEAD = 'mb-2 mt-4 text-xs font-medium text-gray-500 dark:text-zinc-400';
    const PILL = 'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-zinc-100';
    const PILL_ON = ['bg-gray-900', 'text-white', 'border-gray-900', 'dark:bg-zinc-100', 'dark:text-zinc-900', 'dark:border-zinc-100'];
    const PILL_OFF = ['bg-white', 'text-gray-700', 'border-gray-300', 'hover:border-gray-500', 'dark:bg-zinc-900', 'dark:text-zinc-200', 'dark:border-zinc-700', 'dark:hover:border-zinc-500'];
    const SWATCH = 'h-8 w-8 shrink-0 rounded-full border border-gray-300 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:border-zinc-600';
    const SWATCH_ON = ['ring-2', 'ring-gray-900', 'ring-offset-2', 'dark:ring-zinc-100', 'dark:ring-offset-zinc-900'];
    const RANGE = 'w-full accent-gray-900 dark:accent-zinc-100';
    const SLIDER_LABEL = 'mb-1 flex items-center justify-between text-xs text-gray-600 dark:text-zinc-300';
    const SECONDARY_BTN = 'rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500';
    const CHECKER = 'background-color:#fff;background-image:linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0;';
    const CUSTOM_SWATCH = 'background:conic-gradient(#f43f5e,#f59e0b,#84cc16,#06b6d4,#6366f1,#d946ef,#f43f5e);';

    // 阴影高级滑块：path 指向 state.shadow 下的字段；UI 值 ÷ scale = 状态值
    const SHADOW_SLIDERS = {
        contact: [
            { path: 'opacity',  labelKey: 'sliderOpacity',  min: 0,   max: 100, scale: 100 },
            { path: 'softness', labelKey: 'sliderSoftness', min: 0,   max: 100, scale: 100 },
            { path: 'spread',   labelKey: 'sliderSpread',   min: 60,  max: 160, scale: 100 },
            { path: 'squash',   labelKey: 'sliderLength',   min: 0,   max: 30,  scale: 100 },
        ],
        drop: [
            { path: 'opacity', labelKey: 'sliderOpacity', min: 0,   max: 100, scale: 100 },
            { path: 'blur',    labelKey: 'sliderBlur',    min: 0,   max: 20,  scale: 100 },
            { path: 'offsetX', labelKey: 'sliderOffsetX', min: -20, max: 20,  scale: 100 },
            { path: 'offsetY', labelKey: 'sliderOffsetY', min: -20, max: 20,  scale: 100 },
        ],
    };

    const HEX_RE = /^#[0-9a-f]{6}$/i;
    // 尺寸文字「2000 × 2000 px · PNG」和 HEX 输入框固定 dir="ltr"：
    // 乌尔都语等 RTL 页面里，数字和拉丁字母混排会被 bidi 算法重排成「px · PNG 2000 × 2000」

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function setActive(el, active, onClasses, offClasses) {
        onClasses.forEach((c) => el.classList.toggle(c, active));
        if (offClasses) offClasses.forEach((c) => el.classList.toggle(c, !active));
        if (el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    function show(el, visible) {
        if (!el) return;
        el.classList.toggle('hidden', !visible);
        el.hidden = !visible;
    }

    function clamp(v, min, max) {
        return Math.min(max, Math.max(min, v));
    }

    /**
     * 创建编辑器面板。
     *
     * @param {object} opts
     * @param {HTMLElement} opts.container   面板挂载点（会被整体替换 innerHTML）
     * @param {object} opts.engine           engine.createEngine() 的返回值
     * @param {object} opts.config           页面配置（见 app.js EDITOR_PAGE_CONFIGS）
     * @param {(key:string)=>string} opts.t  翻译函数
     * @param {(name:string)=>void} [opts.track]  埋点函数
     * @param {()=>void} [opts.onStartOver]  点「换一张图」
     * @param {()=>void} [opts.onDownloadTransparent]  点「下载透明 PNG」（原始抠图，不经过编辑）
     * @param {(blob:Blob, filename:string)=>void} opts.onDownload  导出完成后由 app.js 负责触发下载
     * @returns {{ state: object, destroy: () => void }}
     */
    function createPanel(opts) {
        const { container, engine, config, t } = opts;
        const track = opts.track || function () {};

        // ---------------- 初始状态 ----------------
        const initial = config.initial || {};
        const state = presets.createDefaultState(initial);
        if (initial.shadowPreset) state.shadow = presets.applyShadowPreset(state.shadow, initial.shadowPreset);

        // 仅界面用的状态（不进 EditorState，不影响绘制）
        const ui = {
            customColor: '#FFEDD5',   // 自定义颜色的当前值
            customActive: false,      // 当前纯色是否来自「自定义」色块
            bgImageUrl: null,         // 用户上传背景图的 object URL（销毁时释放）
            lastInfo: null,           // 最近一次 renderPreview 的结果（尺寸、主体位置）
            rafId: 0,
            pendingInteractive: false,
            drag: null,
            exporting: false,
            // 非原图画幅下用户设置的「主体大小」。切到原图画幅时主体大小会变成 100%（原大小），
            // 切回 1:1 等画幅时恢复这个值，避免主体突然顶满画布
            framedScale: isOriginal(state.layout.ratio) ? 0.8 : state.layout.subjectScale,
        };

        function isOriginal(ratioId) {
            const r = presets.RATIOS.find((x) => x.id === ratioId);
            return !r || r.value == null;
        }

        /**
         * 原图画幅 = 保持原尺寸 + 原位置：主体大小 100%，偏移设为主体在原图里的位置。
         * （画布尺寸由引擎按原图尺寸算，见 engine.js computeExportSize）
         */
        function applyOriginalComposition() {
            state.layout.subjectScale = 1;
            state.layout.offsetX = engine.originalOffset.x;
            state.layout.offsetY = engine.originalOffset.y;
        }
        if (isOriginal(state.layout.ratio)) applyOriginalComposition();

        const ratios = (config.ratios || ['original', '1:1', '4:5', '9:16'])
            .map((id) => presets.RATIOS.find((r) => r.id === id)).filter(Boolean);
        const exportSizes = (config.exportSizes || ['auto', '1080', '2000'])
            .map((id) => presets.EXPORT_SIZES.find((s) => s.id === id)).filter(Boolean);
        const sizeLabel = (s) => (s.labelKey ? t(s.labelKey) : s.label);

        // ---------------- 生成界面 ----------------
        container.innerHTML = buildMarkup();
        const $ = (ref) => container.querySelector(`[data-ref="${ref}"]`);
        const canvas = $('canvas');

        function buildMarkup() {
            const e = (key) => escapeHtml(t(key));
            const pill = (attrs, label) => `<button type="button" ${attrs} aria-pressed="false" class="${PILL}">${label}</button>`;
            const swatch = (attrs, style, title) => `<button type="button" ${attrs} aria-pressed="false" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}" class="${SWATCH}" style="${style}"></button>`;
            const slider = (attrs, labelKey, min, max, valueRef) => `
                <label class="block">
                    <span class="${SLIDER_LABEL}"><span>${e(labelKey)}</span><span data-ref="${valueRef}" class="tabular-nums text-gray-500 dark:text-zinc-400"></span></span>
                    <input type="range" min="${min}" max="${max}" step="1" ${attrs} class="${RANGE}">
                </label>`;
            const shadowGroup = (group, labelKey) => `
                <fieldset class="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-zinc-700" data-ref="group-${group}">
                    <label class="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-800 dark:text-zinc-100">
                        <span>${e(labelKey)}</span>
                        <input type="checkbox" data-shadow-toggle="${group}" class="h-4 w-4 accent-gray-900 dark:accent-zinc-100">
                    </label>
                    ${SHADOW_SLIDERS[group].map((s) => slider(`data-shadow="${group}.${s.path}"`, s.labelKey, s.min, s.max, `val-${group}-${s.path}`)).join('')}
                </fieldset>`;

            const solidSwatches = presets.SOLID_COLORS
                .map((c) => swatch(`data-bg="solid" data-color="${c.value}"`, `background:${c.value};`, t(c.labelKey))).join('');
            const gradientSwatches = presets.GRADIENTS
                .map((g) => swatch(`data-bg="gradient" data-gradient="${g.id}"`, `background:${g.swatch};`, t(g.labelKey))).join('');

            const extraBg = (config.allowBlur || config.allowImage) ? `
                <div class="mt-3 flex flex-wrap gap-2">
                    ${config.allowBlur ? pill('data-bg="blur"', e('bgBlur')) : ''}
                    ${config.allowImage ? `<button type="button" data-action="upload-bg" class="${PILL} ${PILL_OFF.join(' ')}">${e('uploadBgImage')}</button>
                        <input type="file" data-ref="bgFile" accept="image/jpeg, image/png, image/webp" class="hidden">` : ''}
                </div>
                <div data-ref="bgImageControls" class="mt-3 hidden" hidden>
                    ${slider('data-ref="bgScale"', 'bgScaleLabel', 100, 300, 'val-bgScale')}
                    <p class="mt-1 text-xs text-gray-400 dark:text-zinc-500">${e('dragBgHint')}</p>
                </div>` : '';

            const shapeRow = config.showShape ? `
                <p class="${SUBHEAD}">${e('shapeLabel')}</p>
                <div class="flex flex-wrap gap-2">
                    ${pill('data-shape="rect"', e('shapeSquare'))}
                    ${pill('data-shape="circle"', e('shapeCircle'))}
                </div>` : '';

            const amazon = config.showAmazonPreset ? `
                <button type="button" data-action="amazon" class="w-full ${SECONDARY_BTN}">${e('amazonPreset')}</button>` : '';

            return `
            <div class="w-full text-start" data-editor>
                <div class="mb-5 text-center">
                    <p class="text-xl font-bold text-gray-900 dark:text-zinc-50">${e(config.titleKey)}</p>
                    <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">${e(config.subKey)}</p>
                </div>
                <div class="grid gap-6 md:grid-cols-5">
                    <div class="md:col-span-3">
                        <div class="flex flex-col items-center gap-2 md:sticky md:top-20">
                            <div class="flex w-full items-center justify-center rounded-xl bg-gray-100 p-3 dark:bg-zinc-800">
                                <canvas data-ref="canvas" class="block h-auto max-h-[46vh] w-auto max-w-full cursor-grab touch-none rounded-md shadow-sm md:max-h-[560px]" style="${CHECKER}"></canvas>
                            </div>
                            <p data-ref="dims" dir="ltr" class="text-xs tabular-nums text-gray-500 dark:text-zinc-400"></p>
                            <p class="text-xs text-gray-400 dark:text-zinc-500">${e('dragSubjectHint')}</p>
                        </div>
                    </div>

                    <div class="space-y-6 md:col-span-2">
                        ${amazon}

                        <section>
                            <h3 class="${HEAD}">${e('backgroundLabel')}</h3>
                            <div class="flex flex-wrap gap-2">
                                ${swatch('data-bg="transparent"', CHECKER, t('bgTransparent'))}
                                ${solidSwatches}
                                ${swatch('data-bg="custom"', CUSTOM_SWATCH, t('bgCustom'))}
                            </div>
                            <div data-ref="customRow" class="mt-3 hidden items-center gap-2" hidden>
                                <input type="color" data-ref="colorInput" aria-label="${e('bgCustom')}" class="h-9 w-12 cursor-pointer rounded-lg border border-gray-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
                                <input type="text" data-ref="hexInput" dir="ltr" maxlength="7" spellcheck="false" aria-label="HEX" class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                            </div>
                            <p class="${SUBHEAD}">${e('bgStudioLabel')}</p>
                            <div class="flex flex-wrap gap-2">${gradientSwatches}</div>
                            ${extraBg}
                        </section>

                        <section>
                            <h3 class="${HEAD}">${e('shadowLabel')}</h3>
                            <div class="flex flex-wrap gap-2">
                                ${['none', 'contact', 'drop'].map((id) => pill(`data-shadow-preset="${id}"`, e(presets.SHADOW_PRESETS[id].labelKey))).join('')}
                            </div>
                            <p data-ref="croppedHint" class="mt-2 hidden text-xs text-amber-700 dark:text-amber-400" hidden>${e('contactShadowCroppedHint')}</p>
                            <details data-ref="advanced" class="mt-3">
                                <summary class="cursor-pointer select-none text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-zinc-300 dark:hover:text-zinc-50">${e('shadowAdvanced')}</summary>
                                <div class="mt-3 space-y-3">
                                    ${shadowGroup('contact', 'contactShadowLabel')}
                                    ${shadowGroup('drop', 'shadowDrop')}
                                </div>
                            </details>
                        </section>

                        <section>
                            <h3 class="${HEAD}">${e('canvasLabel')}</h3>
                            <div class="flex flex-wrap gap-2">
                                ${ratios.map((r) => pill(`data-ratio="${r.id}"`, e(r.labelKey))).join('')}
                            </div>
                            ${shapeRow}
                            <div class="mt-4">
                                ${slider('data-ref="scale"', 'subjectSizeLabel', 60, 100, 'val-scale')}
                            </div>
                            <div class="mt-3 flex flex-wrap gap-2">
                                <button type="button" data-action="center-h" class="${PILL} ${PILL_OFF.join(' ')}">${e('centerH')}</button>
                                <button type="button" data-action="center-v" data-ref="centerV" class="${PILL} ${PILL_OFF.join(' ')} disabled:cursor-not-allowed disabled:opacity-40">${e('centerV')}</button>
                            </div>
                        </section>

                        <section>
                            <h3 class="${HEAD}">${e('exportLabel')}</h3>
                            <div class="flex flex-wrap gap-2">
                                ${pill('data-format="png"', 'PNG')}
                                ${pill('data-format="jpg"', 'JPG')}
                                ${pill('data-format="webp"', 'WebP')}
                            </div>
                            <div data-ref="qualityRow" class="mt-3 hidden" hidden>
                                ${slider('data-ref="quality"', 'qualityLabel', 50, 100, 'val-quality')}
                            </div>
                            <p class="${SUBHEAD}">${e('exportSizeLabel')}</p>
                            <div class="flex flex-wrap gap-2">
                                ${exportSizes.map((s) => pill(`data-export-size="${s.id}"`, escapeHtml(sizeLabel(s)))).join('')}
                            </div>
                            <p data-ref="jpgHint" class="mt-2 hidden text-xs text-gray-500 dark:text-zinc-400" hidden>${e('jpgMatteHint')}</p>
                            <div class="mt-4 space-y-2">
                                <button type="button" data-action="download" data-ref="download" class="w-full rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">${e('downloadImage')}</button>
                                <p data-ref="exportNote" class="hidden text-xs text-amber-700 dark:text-amber-400" hidden></p>
                                <button type="button" data-action="download-transparent" class="w-full ${SECONDARY_BTN}">${e('downloadTransparent')}</button>
                                <button type="button" data-action="start-over" class="w-full rounded-full px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-50">${e('startOver')}</button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>`;
        }

        // ---------------- 渲染调度 ----------------
        function scheduleRender(interactive) {
            ui.pendingInteractive = !!interactive;
            if (ui.rafId) return;
            ui.rafId = requestAnimationFrame(() => {
                ui.rafId = 0;
                ui.lastInfo = engine.renderPreview(canvas, state, {
                    dpr: window.devicePixelRatio || 1,
                    interactive: ui.pendingInteractive,
                });
                const fmt = state.export.format === 'jpg' ? 'JPG' : (state.export.format === 'webp' ? 'WebP' : 'PNG');
                $('dims').textContent = `${ui.lastInfo.exportWidth} × ${ui.lastInfo.exportHeight} px · ${fmt}`;
            });
        }

        /** 改完状态后调用：同步控件外观 + 安排重绘 */
        function commit(interactive) {
            syncControls();
            scheduleRender(interactive);
        }

        // ---------------- 控件 ← 状态 ----------------
        function syncControls() {
            const bg = state.background;
            container.querySelectorAll('[data-bg]').forEach((el) => {
                const kind = el.dataset.bg;
                let active = false;
                if (kind === 'transparent') active = bg.type === 'transparent';
                else if (kind === 'custom') active = bg.type === 'solid' && ui.customActive;
                else if (kind === 'solid') active = bg.type === 'solid' && !ui.customActive && el.dataset.color.toLowerCase() === String(bg.color).toLowerCase();
                else if (kind === 'gradient') active = bg.type === 'gradient' && el.dataset.gradient === bg.gradientId;
                else if (kind === 'blur') active = bg.type === 'blur';
                if (el.classList.contains('h-8')) setActive(el, active, SWATCH_ON);
                else setActive(el, active, PILL_ON, PILL_OFF);
            });

            const customRow = $('customRow');
            show(customRow, bg.type === 'solid' && ui.customActive);
            customRow.classList.toggle('flex', bg.type === 'solid' && ui.customActive);
            $('colorInput').value = ui.customColor;
            if (document.activeElement !== $('hexInput')) $('hexInput').value = ui.customColor.toUpperCase();

            const hasBgImage = bg.type === 'image' && bg.image;
            show($('bgImageControls'), !!hasBgImage);
            const uploadBtn = container.querySelector('[data-action="upload-bg"]');
            if (uploadBtn) {
                uploadBtn.textContent = t(ui.bgImageUrl ? 'replaceBgImage' : 'uploadBgImage');
                setActive(uploadBtn, !!hasBgImage, PILL_ON, PILL_OFF);
            }
            if (hasBgImage) setSlider('bgScale', Math.round((bg.image.scale || 1) * 100), 'val-bgScale', (v) => `${v}%`);

            // 阴影
            container.querySelectorAll('[data-shadow-preset]').forEach((el) => {
                setActive(el, state.shadow.preset === el.dataset.shadowPreset, PILL_ON, PILL_OFF);
            });
            ['contact', 'drop'].forEach((group) => {
                const toggle = container.querySelector(`[data-shadow-toggle="${group}"]`);
                toggle.checked = !!state.shadow[group].enabled;
                SHADOW_SLIDERS[group].forEach((s) => {
                    const input = container.querySelector(`[data-shadow="${group}.${s.path}"]`);
                    const v = Math.round(state.shadow[group][s.path] * s.scale);
                    if (document.activeElement !== input) input.value = String(v);
                    $(`val-${group}-${s.path}`).textContent = `${v}%`;
                });
                $(`group-${group}`).classList.toggle('opacity-60', !state.shadow[group].enabled);
            });
            // 主体被原图底边截断：引擎会自动贴底并跳过接地阴影，这里给出提示并禁用对应控件
            const cropped = !!engine.touchesBottom;
            show($('croppedHint'), cropped && state.shadow.contact.enabled);
            $('group-contact').disabled = cropped;

            // 画幅
            container.querySelectorAll('[data-ratio]').forEach((el) => setActive(el, state.layout.ratio === el.dataset.ratio, PILL_ON, PILL_OFF));
            container.querySelectorAll('[data-shape]').forEach((el) => setActive(el, state.layout.shape === el.dataset.shape, PILL_ON, PILL_OFF));
            setSlider('scale', Math.round(state.layout.subjectScale * 100), 'val-scale', (v) => `${v}%`);
            $('centerV').disabled = cropped; // 贴底的主体不能垂直居中

            // 导出
            container.querySelectorAll('[data-format]').forEach((el) => setActive(el, state.export.format === el.dataset.format, PILL_ON, PILL_OFF));
            container.querySelectorAll('[data-export-size]').forEach((el) => setActive(el, state.layout.exportSize === el.dataset.exportSize, PILL_ON, PILL_OFF));
            show($('qualityRow'), state.export.format !== 'png');
            setSlider('quality', Math.round(state.export.quality * 100), 'val-quality', (v) => `${v}%`);
            // JPG 没有透明通道：背景透明或圆形裁切时，透明区域会被铺成白色，提前告诉用户
            show($('jpgHint'), state.export.format === 'jpg' && (bg.type === 'transparent' || state.layout.shape === 'circle'));
        }

        function setSlider(ref, value, valueRef, format) {
            const input = $(ref);
            if (!input) return;
            if (document.activeElement !== input) input.value = String(value);
            $(valueRef).textContent = format(value);
        }

        // ---------------- 状态 ← 控件 ----------------
        function onClick(event) {
            const el = event.target.closest('button');
            if (!el || !container.contains(el)) return;

            if (el.dataset.bg) {
                const kind = el.dataset.bg;
                ui.customActive = kind === 'custom';
                if (kind === 'transparent') state.background.type = 'transparent';
                else if (kind === 'solid') Object.assign(state.background, { type: 'solid', color: el.dataset.color });
                else if (kind === 'custom') Object.assign(state.background, { type: 'solid', color: ui.customColor });
                else if (kind === 'gradient') Object.assign(state.background, { type: 'gradient', gradientId: el.dataset.gradient });
                else if (kind === 'blur') state.background.type = 'blur';
                commit(false);
                return;
            }
            if (el.dataset.shadowPreset) {
                const id = el.dataset.shadowPreset;
                state.shadow = presets.applyShadowPreset(state.shadow, id);
                if (id !== 'none') track(`editor-shadow-${id}`);
                commit(false);
                return;
            }
            if (el.dataset.ratio) {
                const wasOriginal = isOriginal(state.layout.ratio);
                const next = el.dataset.ratio;
                if (next === state.layout.ratio) return;
                if (!wasOriginal) ui.framedScale = state.layout.subjectScale;
                state.layout.ratio = next;
                if (isOriginal(next)) {
                    applyOriginalComposition();
                } else if (wasOriginal) {
                    // 从原图切到 1:1 等画幅：恢复之前的留白，主体重新居中
                    Object.assign(state.layout, { subjectScale: ui.framedScale, offsetX: 0, offsetY: 0 });
                }
                commit(false);
                return;
            }
            if (el.dataset.shape) {
                state.layout.shape = el.dataset.shape;
                commit(false);
                return;
            }
            if (el.dataset.format) {
                state.export.format = el.dataset.format;
                show($('exportNote'), false);
                commit(false);
                return;
            }
            if (el.dataset.exportSize) {
                state.layout.exportSize = el.dataset.exportSize;
                commit(false);
                return;
            }

            switch (el.dataset.action) {
                case 'center-h':
                    state.layout.offsetX = 0;
                    commit(false);
                    break;
                case 'center-v':
                    state.layout.offsetY = 0;
                    commit(false);
                    break;
                case 'amazon':
                    // 亚马逊主图规范：纯白底、方图、长边 ≥ 1600（取 2000）、主体约占 85%、不加阴影
                    ui.customActive = false;
                    Object.assign(state.background, { type: 'solid', color: '#FFFFFF' });
                    Object.assign(state.layout, { ratio: '1:1', exportSize: '2000', subjectScale: 0.85, offsetX: 0, offsetY: 0 });
                    state.shadow = presets.applyShadowPreset(state.shadow, 'none');
                    track('amazon-preset-applied');
                    commit(false);
                    break;
                case 'upload-bg':
                    $('bgFile').click();
                    break;
                case 'download':
                    exportAndDownload();
                    break;
                case 'download-transparent':
                    if (opts.onDownloadTransparent) opts.onDownloadTransparent();
                    break;
                case 'start-over':
                    if (opts.onStartOver) opts.onStartOver();
                    break;
                default:
                    break;
            }
        }

        // range 拖动中 → interactive；松手（change）→ 高清
        function onInput(event) {
            handleValueChange(event.target, true);
        }
        function onChange(event) {
            const el = event.target;
            if (el.type === 'file') {
                handleBgFile(el);
                return;
            }
            handleValueChange(el, false);
        }

        function handleValueChange(el, interactive) {
            if (el.dataset.shadow) {
                const [group, path] = el.dataset.shadow.split('.');
                const def = SHADOW_SLIDERS[group].find((s) => s.path === path);
                state.shadow[group][path] = Number(el.value) / def.scale;
                state.shadow[group].enabled = true; // 动了滑块就自动打开这一组
                state.shadow.preset = 'custom';
                commit(interactive);
                return;
            }
            if (el.dataset.shadowToggle) {
                state.shadow[el.dataset.shadowToggle].enabled = el.checked;
                state.shadow.preset = 'custom';
                commit(false);
                return;
            }
            const ref = el.dataset.ref;
            if (ref === 'scale') {
                state.layout.subjectScale = clamp(Number(el.value) / 100, 0.6, 1);
                commit(interactive);
            } else if (ref === 'quality') {
                state.export.quality = clamp(Number(el.value) / 100, 0.5, 1);
                syncControls();
            } else if (ref === 'bgScale' && state.background.image) {
                state.background.image.scale = clamp(Number(el.value) / 100, 1, 3);
                commit(interactive);
            } else if (ref === 'colorInput' || ref === 'hexInput') {
                const value = el.value.startsWith('#') ? el.value : `#${el.value}`;
                if (!HEX_RE.test(value)) return; // 输入到一半（如 "#FF"）先不应用
                ui.customColor = value;
                ui.customActive = true;
                Object.assign(state.background, { type: 'solid', color: value });
                commit(interactive);
            }
        }

        function handleBgFile(input) {
            const file = input.files && input.files[0];
            input.value = '';
            if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return;
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                if (ui.bgImageUrl) URL.revokeObjectURL(ui.bgImageUrl);
                ui.bgImageUrl = url;
                ui.customActive = false;
                state.background.type = 'image';
                state.background.image = { img, scale: 1, offsetX: 0, offsetY: 0 };
                track('background-image-uploaded');
                commit(false);
            };
            img.onerror = () => URL.revokeObjectURL(url);
            img.src = url;
        }

        // ---------------- 在预览上拖动主体 / 背景图 ----------------
        // 点在主体上 → 移动主体；点在空白处且背景是图片 → 移动背景图。
        function onPointerDown(event) {
            const info = ui.lastInfo;
            if (!info || event.button > 0) return;
            const r = canvas.getBoundingClientRect();
            const fx = (event.clientX - r.left) / r.width;
            const fy = (event.clientY - r.top) / r.height;
            const s = info.subject;
            const inSubject = fx >= s.x / info.width && fx <= (s.x + s.width) / info.width
                && fy >= s.y / info.height && fy <= (s.y + s.height) / info.height;
            const mode = inSubject ? 'subject' : (state.background.type === 'image' && state.background.image ? 'bg' : null);
            if (!mode) return;
            ui.drag = { mode, x: event.clientX, y: event.clientY, w: r.width, h: r.height };
            canvas.setPointerCapture(event.pointerId);
            canvas.classList.add('cursor-grabbing');
            event.preventDefault();
        }

        function onPointerMove(event) {
            const d = ui.drag;
            if (!d) return;
            const dx = (event.clientX - d.x) / d.w;
            const dy = (event.clientY - d.y) / d.h;
            d.x = event.clientX;
            d.y = event.clientY;
            // 靠近中心 1% 以内吸附到正中（磁吸，方便回到居中）
            const snap = (v) => (Math.abs(v) < 0.01 ? 0 : v);
            if (d.mode === 'subject') {
                d.rawX = clamp((d.rawX !== undefined ? d.rawX : state.layout.offsetX) + dx, -0.5, 0.5);
                state.layout.offsetX = snap(d.rawX);
                if (!engine.touchesBottom) {
                    d.rawY = clamp((d.rawY !== undefined ? d.rawY : state.layout.offsetY) + dy, -0.5, 0.5);
                    state.layout.offsetY = snap(d.rawY);
                }
            } else {
                const img = state.background.image;
                img.offsetX = clamp((img.offsetX || 0) + dx, -1, 1);
                img.offsetY = clamp((img.offsetY || 0) + dy, -1, 1);
            }
            scheduleRender(true);
        }

        function onPointerUp() {
            if (!ui.drag) return;
            ui.drag = null;
            canvas.classList.remove('cursor-grabbing');
            scheduleRender(false);
        }

        // ---------------- 导出 ----------------
        function exportAndDownload() {
            if (ui.exporting) return;
            ui.exporting = true;
            const btn = $('download');
            btn.disabled = true;
            btn.textContent = t('exporting');
            show($('exportNote'), false);
            const requested = state.export.format;
            // 让「正在生成…」先渲染出来再做重活（导出大图会占用主线程 ~100ms）
            requestAnimationFrame(() => {
                engine.exportImage(state)
                    .then((result) => {
                        opts.onDownload(result.blob, result.filename);
                        track('edited-download');
                        if (result.format !== requested) {
                            // 老版 Safari 不支持导出 WebP，引擎已自动改成 PNG
                            $('exportNote').textContent = t('webpFallbackHint');
                            show($('exportNote'), true);
                        }
                    })
                    .catch(() => {
                        $('exportNote').textContent = t('exportFailed');
                        show($('exportNote'), true);
                    })
                    .finally(() => {
                        ui.exporting = false;
                        btn.disabled = false;
                        btn.textContent = t('downloadImage');
                    });
            });
        }

        // ---------------- 绑定 & 首帧 ----------------
        container.addEventListener('click', onClick);
        container.addEventListener('input', onInput);
        container.addEventListener('change', onChange);
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);

        syncControls();
        scheduleRender(false);

        function destroy() {
            if (ui.rafId) cancelAnimationFrame(ui.rafId);
            container.removeEventListener('click', onClick);
            container.removeEventListener('input', onInput);
            container.removeEventListener('change', onChange);
            if (ui.bgImageUrl) URL.revokeObjectURL(ui.bgImageUrl);
            ui.bgImageUrl = null;
            // 预览 canvas 尺寸归零，及时释放内存（iOS Safari）
            canvas.width = 0;
            canvas.height = 0;
        }

        return { state, destroy };
    }

    root.MiaoCutEditor = root.MiaoCutEditor || {};
    root.MiaoCutEditor.createPanel = createPanel;
})(window);

/**
 * MiaoCut 后处理编辑器 —— 预设数据
 * ============================================================
 * 这里只放「纯数据」：背景色、柔光渐变、阴影档位、画幅比例、导出限制、默认状态。
 * 不含任何绘制逻辑（绘制在 engine.js），也不碰 DOM（界面在 panel.js）。
 * 想加一个新背景 / 新阴影档位，只改这个文件即可。
 *
 * 加载方式：普通 <script>，挂到 window.MiaoCutEditor.presets；
 * 在 Node 里 require 时走 module.exports（单元测试用）。
 */
(function (root) {
    'use strict';

    // ------------------------------------------------------------
    // 纯色背景预设
    // ------------------------------------------------------------
    // labelKey 对应 i18n 字典里的 key（面板负责翻译），value 是实际填充色。
    const SOLID_COLORS = [
        { id: 'white',     value: '#FFFFFF', labelKey: 'bgWhite' },      // 电商白底（Amazon / Shopify 主图要求纯白）
        { id: 'snow',      value: '#F5F5F7', labelKey: 'bgSnow' },       // 极简浅灰（苹果官网风）
        { id: 'lightGray', value: '#E5E7EB', labelKey: 'bgLightGray' },  // 浅灰
        { id: 'idBlue',    value: '#438EDB', labelKey: 'bgIdBlue' },     // 证件照标准蓝
        { id: 'idRed',     value: '#D0021B', labelKey: 'bgIdRed' },      // 证件照标准红
        { id: 'black',     value: '#000000', labelKey: 'bgBlack' },      // 纯黑
    ];

    // ------------------------------------------------------------
    // 摄影棚柔光渐变预设
    // ------------------------------------------------------------
    // 坐标全部是「相对画布」的比例（0~1），这样预览和高清导出画出来完全一致。
    //   kind = 'radial'：cx/cy 是圆心位置，r 是半径（相对画布长边）
    //   kind = 'linear'：x0,y0 → x1,y1 是渐变方向（相对画布宽高）
    //   stops：[位置 0~1, 颜色]
    // swatch 是面板上小色块用的 CSS 背景，只用于展示。
    const GRADIENTS = [
        {
            // 顶部柔光：模拟顶灯打下来，上亮下暗，最常用的产品图背景
            id: 'studio-top',
            labelKey: 'gradStudioTop',
            kind: 'radial', cx: 0.5, cy: -0.15, r: 1.25,
            stops: [[0, '#FFFFFF'], [0.45, '#F1F1F3'], [1, '#D4D4D8']],
            swatch: 'radial-gradient(circle at 50% -15%,#FFFFFF,#F1F1F3 45%,#D4D4D8)',
        },
        {
            // 无缝背景纸：上半墙面、下半地面，主体像放在摄影棚的弧形背景纸上
            id: 'cove',
            labelKey: 'gradCove',
            kind: 'linear', x0: 0, y0: 0, x1: 0, y1: 1,
            stops: [[0, '#F7F7F8'], [0.6, '#EDEDEF'], [1, '#D9D9DE']],
            swatch: 'linear-gradient(180deg,#F7F7F8,#EDEDEF 60%,#D9D9DE)',
        },
        {
            // 轻奢暖灰：偏米色，适合美妆 / 首饰 / 家居
            id: 'warm-gray',
            labelKey: 'gradWarmGray',
            kind: 'radial', cx: 0.5, cy: 0.3, r: 1.0,
            stops: [[0, '#FBF8F3'], [0.55, '#ECE5DB'], [1, '#D3C9BC']],
            swatch: 'radial-gradient(circle at 50% 30%,#FBF8F3,#ECE5DB 55%,#D3C9BC)',
        },
        {
            // 聚光灯：中间亮、四周暗角，突出主体
            id: 'spotlight',
            labelKey: 'gradSpotlight',
            kind: 'radial', cx: 0.5, cy: 0.45, r: 0.85,
            stops: [[0, '#FFFFFF'], [0.5, '#E8E9ED'], [1, '#B9BCC4']],
            swatch: 'radial-gradient(circle at 50% 45%,#FFFFFF,#E8E9ED 50%,#B9BCC4)',
        },
        {
            // 冷调晨雾：淡蓝灰，适合数码 / 科技产品
            id: 'cool-mist',
            labelKey: 'gradCoolMist',
            kind: 'linear', x0: 0.2, y0: 0, x1: 0.8, y1: 1,
            stops: [[0, '#F5F8FC'], [1, '#D6DEE9']],
            swatch: 'linear-gradient(160deg,#F5F8FC,#D6DEE9)',
        },
    ];

    // ------------------------------------------------------------
    // 阴影
    // ------------------------------------------------------------
    // 参数单位约定（重要）：所有长度都是「占主体高度的比例」，不是像素。
    // 这样主体在预览里 300px 高、导出时 1800px 高，阴影看起来是一模一样的。
    //
    // drop（立体投影，沿主体轮廓的投影）：
    //   opacity  0~1     阴影浓度
    //   blur     0~0.2   模糊半径 = blur × 主体高度
    //   offsetX  -0.2~0.2  水平偏移 = offsetX × 主体高度
    //   offsetY  -0.2~0.2  垂直偏移 = offsetY × 主体高度
    //
    // contact（接地阴影，解决主体「悬空」）：
    //   opacity  0~1     浓度
    //   spread   0.6~1.6 椭圆暗部宽度 = 底部接触宽度 × spread
    //   softness 0~1     羽化程度，越大越柔、越散
    //   squash   0.04~0.3  投在地面上的影子长度 = squash × 主体高度（越大影子拖得越长）
    const SHADOW_DEFAULTS = {
        drop:    { enabled: false, opacity: 0.28, blur: 0.05, offsetX: 0.02, offsetY: 0.04 },
        contact: { enabled: false, opacity: 0.5,  spread: 1.0, softness: 0.5, squash: 0.12 },
    };

    // 三个一键预设：对应需求里的「无阴影 / 轻柔落地 / 立体投影」
    const SHADOW_PRESETS = {
        none: {
            labelKey: 'shadowNone',
            drop:    { enabled: false },
            contact: { enabled: false },
        },
        contact: {
            labelKey: 'shadowContact',
            drop:    { enabled: false },
            contact: { enabled: true, opacity: 0.5, spread: 1.0, softness: 0.5, squash: 0.12 },
        },
        drop: {
            // 立体投影也叠一层很淡的接地暗部，否则投影离开主体后底部会显得空
            labelKey: 'shadowDrop',
            drop:    { enabled: true, opacity: 0.28, blur: 0.05, offsetX: 0.02, offsetY: 0.04 },
            contact: { enabled: true, opacity: 0.25, spread: 0.9, softness: 0.4, squash: 0.06 },
        },
    };

    // ------------------------------------------------------------
    // 画幅比例
    // ------------------------------------------------------------
    // value = 宽 / 高；original 的 value 为 null，表示「保持原图尺寸 + 主体原位置」（见 engine.js computeExportSize）。
    // fileLabel 用在下载文件名里（冒号不能出现在文件名中）。
    const RATIOS = [
        { id: 'original', value: null,   labelKey: 'ratioOriginal', fileLabel: 'original' },
        { id: '1:1',      value: 1,      labelKey: 'ratioSquare',   fileLabel: '1x1' },
        { id: '4:5',      value: 4 / 5,  labelKey: 'ratioPortrait', fileLabel: '4x5' },
        { id: '3:4',      value: 3 / 4,  labelKey: 'ratio34',       fileLabel: '3x4' },   // 证件照 / 简历照（人像页用）
        { id: '9:16',     value: 9 / 16, labelKey: 'ratioStory',    fileLabel: '9x16' },
    ];

    // 可选固定导出尺寸（长边像素）；null = 按规则自动计算。
    // 亚马逊主图建议长边 ≥ 1600 才能放大查看，所以给 2000 档；512 / 1024 是头像常用尺寸。
    // 各页面在 app.js 的页面配置里挑自己要显示的几档。
    const EXPORT_SIZES = [
        { id: 'auto', longSide: null, labelKey: 'sizeAuto' },
        { id: '512',  longSide: 512,  label: '512 px' },
        { id: '1024', longSide: 1024, label: '1024 px' },
        { id: '1080', longSide: 1080, label: '1080 px' },
        { id: '2000', longSide: 2000, label: '2000 px' },
    ];

    // ------------------------------------------------------------
    // 导出限制
    // ------------------------------------------------------------
    const EXPORT_LIMITS = {
        // 长边上限：再大文件太大，且部分手机浏览器画不出来
        maxSide: 4096,
        // 总像素上限：iOS Safari 单个 canvas 超过 16,777,216 像素（4096²）会直接画成空白，
        // 留一点余量取 16,000,000
        maxPixels: 16000000,
        // 长边下限：主体很小时（比如只有 200px 的 logo）自动放大到这个尺寸，
        // 避免导出一张 250px 的小图。放大会略微变软，但比小图实用。
        minLongSide: 1024,
    };

    // 预览画布长边（CSS 像素）。实际会乘以 devicePixelRatio（最多 2），保证高清屏不糊。
    const PREVIEW_MAX_SIDE = 720;

    // ------------------------------------------------------------
    // 默认编辑器状态
    // ------------------------------------------------------------
    // 返回新对象（深拷贝），调用方可以放心修改。各页面通过 overrides 覆盖初始值，
    // 例如产品图页：{ background: { type: 'solid', color: '#FFFFFF' }, layout: { ratio: '1:1' } }
    function createDefaultState(overrides) {
        const base = {
            background: {
                type: 'transparent',      // 'transparent' | 'solid' | 'gradient' | 'blur' | 'image'
                color: '#FFFFFF',         // type = solid
                gradientId: 'studio-top', // type = gradient
                image: null,              // type = image：{ img, scale: 1~3, offsetX, offsetY }（offset 相对画布）
            },
            shadow: {
                preset: 'none',           // 'none' | 'contact' | 'drop' | 'custom'（动了滑块就是 custom）
                drop: Object.assign({}, SHADOW_DEFAULTS.drop),
                contact: Object.assign({}, SHADOW_DEFAULTS.contact),
            },
            layout: {
                ratio: 'original',        // RATIOS 里的 id
                subjectScale: 0.8,        // 主体占画布比例 0.6~1.0；0.8 = 四边各留 10%
                offsetX: 0,               // 主体中心相对画布中心的偏移（相对画布宽）
                offsetY: 0,               // 同上（相对画布高）
                shape: 'rect',            // 'rect' | 'circle'（人像页头像）
                exportSize: 'auto',       // EXPORT_SIZES 里的 id
            },
            export: {
                format: 'png',            // 'png' | 'jpg' | 'webp'
                quality: 0.92,            // jpg / webp 的压缩质量 0~1
                jpgMatte: '#FFFFFF',      // 背景透明但导出 jpg 时垫的底色
            },
        };
        if (!overrides) return base;
        // 按分组浅合并：overrides.layout 只覆盖给出的字段，其他保持默认
        Object.keys(overrides).forEach((group) => {
            if (base[group] && typeof base[group] === 'object' && overrides[group]) {
                Object.assign(base[group], overrides[group]);
            }
        });
        if (overrides.shadow) {
            if (overrides.shadow.drop) base.shadow.drop = Object.assign({}, SHADOW_DEFAULTS.drop, overrides.shadow.drop);
            if (overrides.shadow.contact) base.shadow.contact = Object.assign({}, SHADOW_DEFAULTS.contact, overrides.shadow.contact);
        }
        return base;
    }

    // 把一键阴影预设套到 state.shadow 上（返回新的 shadow 对象，不改原对象）
    function applyShadowPreset(shadow, presetId) {
        const preset = SHADOW_PRESETS[presetId];
        if (!preset) return shadow;
        return {
            preset: presetId,
            drop: Object.assign({}, SHADOW_DEFAULTS.drop, preset.drop),
            contact: Object.assign({}, SHADOW_DEFAULTS.contact, preset.contact),
        };
    }

    const presets = {
        SOLID_COLORS,
        GRADIENTS,
        SHADOW_DEFAULTS,
        SHADOW_PRESETS,
        RATIOS,
        EXPORT_SIZES,
        EXPORT_LIMITS,
        PREVIEW_MAX_SIDE,
        createDefaultState,
        applyShadowPreset,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = presets;
    } else {
        root.MiaoCutEditor = root.MiaoCutEditor || {};
        root.MiaoCutEditor.presets = presets;
    }
})(typeof window !== 'undefined' ? window : globalThis);

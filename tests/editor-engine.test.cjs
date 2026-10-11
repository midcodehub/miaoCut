/**
 * 渲染引擎纯函数单元测试（不需要浏览器 / canvas）
 * 运行：npm run test:editor
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../editor/engine.js');
const presets = require('../editor/presets.js');

// 造一张 RGBA 图：fill(x, y) 返回 alpha
function makeAlpha(width, height, fill) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) data[(y * width + x) * 4 + 3] = fill(x, y);
    }
    return data;
}

test('analyzeAlpha：包围盒忽略四周透明空白', () => {
    const data = makeAlpha(100, 80, (x, y) => (x >= 20 && x < 60 && y >= 10 && y < 70 ? 255 : 0));
    const { bbox } = engine.analyzeAlpha(data, 100, 80);
    assert.deepEqual(bbox, { x: 20, y: 10, width: 40, height: 60 });
});

test('analyzeAlpha：接触面只取底部，马克杯把手不算进去', () => {
    // 杯身 x 30~59 贯穿上下；把手 x 60~79 只在中间高度
    const data = makeAlpha(100, 100, (x, y) => {
        if (y < 10 || y >= 90) return 0;
        if (x >= 30 && x < 60) return 255;
        if (x >= 60 && x < 80 && y >= 30 && y < 60) return 255;
        return 0;
    });
    const { bbox, footprint } = engine.analyzeAlpha(data, 100, 100);
    assert.equal(bbox.width, 50); // 包围盒含把手
    assert.deepEqual(footprint, { x0: 30, x1: 59 }); // 接触面只有杯底
});

test('analyzeAlpha：运动鞋鞋跟和前掌都算着地，足弓不算', () => {
    // 鞋身 y 20~69；底边：x 10~29 鞋跟到 y=79，x 30~59 足弓只到 y=72，x 60~89 前掌到 y=79
    const data = makeAlpha(100, 100, (x, y) => {
        if (x < 10 || x >= 90 || y < 20) return 0;
        const bottom = x < 30 ? 79 : (x < 60 ? 72 : 79);
        return y <= bottom ? 255 : 0;
    });
    const { ground, contact, bbox } = engine.analyzeAlpha(data, 100, 100);
    assert.equal(ground, 79);
    const at = (x) => contact[x - bbox.x];
    assert.equal(at(15), 1);  // 鞋跟
    assert.equal(at(75), 1);  // 前掌
    assert.equal(at(45), 0);  // 足弓离地 7px > 60×4% → 不着地
});

test('analyzeAlpha：地面线忽略底部半透明羽化', () => {
    // 主体实心到 y=59，下面挂 5 行 alpha=30 的淡羽化
    const data = makeAlpha(50, 80, (x, y) => (y >= 10 && y < 60 ? 255 : (y >= 60 && y < 65 ? 30 : 0)));
    const { bbox, ground } = engine.analyzeAlpha(data, 50, 80);
    assert.equal(bbox.y + bbox.height - 1, 64); // 包围盒含羽化
    assert.equal(ground, 59);                   // 地面线贴着实心底边
});

test('analyzeAlpha + computeSubjectRect：被原图底边截断的半身像贴画布底边', () => {
    // 主体从 y=20 一直到图片最后一行（y=99）
    const data = makeAlpha(80, 100, (x, y) => (x >= 10 && x < 70 && y >= 20 ? 255 : 0));
    const { bbox, touchesBottom } = engine.analyzeAlpha(data, 80, 100);
    assert.equal(touchesBottom, true);
    const rect = engine.computeSubjectRect(bbox, 1000, 1250, { subjectScale: 0.8, offsetY: -0.2 }, touchesBottom);
    assert.ok(Math.abs(rect.y + rect.height - 1250) < 1e-9, '底边应贴住画布底边');
    // 不截断的主体照常居中
    const free = engine.analyzeAlpha(makeAlpha(80, 100, (x, y) => (y >= 20 && y < 90 ? 255 : 0)), 80, 100);
    assert.equal(free.touchesBottom, false);
});

test('analyzeAlpha：全透明时退化为整张图，不报错', () => {
    const { bbox, footprint } = engine.analyzeAlpha(makeAlpha(10, 8, () => 0), 10, 8);
    assert.deepEqual(bbox, { x: 0, y: 0, width: 10, height: 8 });
    assert.deepEqual(footprint, { x0: 0, x1: 9 });
});

test('computeExportSize：1:1 + 80% 占比，主体按原像素画、不放大', () => {
    const bbox = { width: 1200, height: 1600 };
    const size = engine.computeExportSize(bbox, { ratio: '1:1', subjectScale: 0.8, exportSize: 'auto' }, { width: 2048, height: 2048 });
    assert.deepEqual(size, { width: 2000, height: 2000 }); // 1600 / 0.8 = 2000
    const rect = engine.computeSubjectRect(bbox, size.width, size.height, { subjectScale: 0.8 });
    assert.ok(Math.abs(rect.scale - 1) < 1e-9, '主体缩放应为 1:1');
});

test('computeExportSize：9:16 宽高比正确', () => {
    const size = engine.computeExportSize({ width: 800, height: 900 }, { ratio: '9:16', subjectScale: 0.8, exportSize: 'auto' }, { width: 1000, height: 1000 });
    assert.ok(Math.abs(size.width / size.height - 9 / 16) < 0.002);
});

test('原图画幅：画布 = 抠图原尺寸，小图也不放大', () => {
    const image = { width: 1600, height: 1200 };
    const layout = { ratio: 'original', subjectScale: 1, exportSize: 'auto' };
    assert.deepEqual(engine.computeExportSize({ width: 500, height: 400 }, layout, image), { width: 1600, height: 1200 });
    // 小图（长边 < minLongSide）保持原尺寸，不像其他画幅那样放大到 1024
    assert.deepEqual(engine.computeExportSize({ width: 100, height: 80 }, layout, { width: 300, height: 200 }), { width: 300, height: 200 });
});

test('原图画幅：主体大小 100% + originalOffset = 原图里的原位置', () => {
    const image = { width: 1600, height: 1200 };
    const bbox = { x: 200, y: 300, width: 500, height: 400 };
    const off = engine.computeOriginalOffset(bbox, image);
    const layout = { ratio: 'original', subjectScale: 1, offsetX: off.x, offsetY: off.y };
    const rect = engine.computeSubjectRect(bbox, 1600, 1200, layout, false, image);
    for (const f of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(rect[f] - bbox[f]) < 1e-9, `${f} 应与原图一致`);
    // 预览（缩小到 400×300）时等比缩小，位置比例不变
    const small = engine.computeSubjectRect(bbox, 400, 300, layout, false, image);
    assert.ok(Math.abs(small.x - bbox.x / 4) < 1e-9 && Math.abs(small.width - bbox.width / 4) < 1e-9);
});

test('原图画幅：指定固定长边时整体等比缩放', () => {
    const size = engine.computeExportSize({ width: 500, height: 400 }, { ratio: 'original', subjectScale: 1, exportSize: '2000' }, { width: 1600, height: 1200 });
    assert.deepEqual(size, { width: 2000, height: 1500 });
});

test('computeExportSize：小主体自动放大到最小长边', () => {
    const size = engine.computeExportSize({ width: 200, height: 100 }, { ratio: '1:1', subjectScale: 1, exportSize: 'auto' }, { width: 256, height: 256 });
    assert.equal(Math.max(size.width, size.height), presets.EXPORT_LIMITS.minLongSide);
});

test('computeExportSize：固定长边 2000', () => {
    const size = engine.computeExportSize({ width: 500, height: 500 }, { ratio: '4:5', subjectScale: 0.8, exportSize: '2000' }, { width: 600, height: 600 });
    assert.equal(size.height, 2000);
    assert.equal(size.width, 1600);
});

test('computeExportSize：不超过长边与总像素上限（iOS canvas 限制）', () => {
    const size = engine.computeExportSize({ width: 2048, height: 2048 }, { ratio: '9:16', subjectScale: 0.6, exportSize: 'auto' }, { width: 2048, height: 2048 });
    assert.ok(Math.max(size.width, size.height) <= presets.EXPORT_LIMITS.maxSide);
    assert.ok(size.width * size.height <= presets.EXPORT_LIMITS.maxPixels);
});

test('computeSubjectRect：预览与导出构图一致（相对位置相同）', () => {
    const bbox = { width: 900, height: 1200 };
    const layout = { subjectScale: 0.75, offsetX: 0.1, offsetY: -0.05 };
    const big = engine.computeSubjectRect(bbox, 2000, 2500, layout);
    const small = engine.computeSubjectRect(bbox, 400, 500, layout);
    const k = 400 / 2000;
    for (const f of ['x', 'y', 'width', 'height']) {
        assert.ok(Math.abs(big[f] * k - small[f]) < 1e-6, `${f} 不一致`);
    }
});

test('computeSubjectRect：offset 被限制在画布范围内', () => {
    const rect = engine.computeSubjectRect({ width: 100, height: 100 }, 1000, 1000, { subjectScale: 0.5, offsetX: 3, offsetY: 0 });
    assert.equal(rect.x + rect.width / 2, 1000); // 最多移到画布边缘
});

test('buildFileName：规范命名 + 去非法字符 + 保留中文', () => {
    assert.equal(engine.buildFileName('cat photo.JPG', '1:1', 'png'), 'miaocut-cat-photo-1x1.png');
    assert.equal(engine.buildFileName('a/b:c*?.png', '9:16', 'jpg'), 'miaocut-abc-9x16.jpg');
    assert.equal(engine.buildFileName('我的猫.webp', 'original', 'webp'), 'miaocut-我的猫-original.webp');
    assert.equal(engine.buildFileName('', '4:5', 'png'), 'miaocut-image-4x5.png');
});

test('presets：阴影一键预设与默认状态', () => {
    const shadow = presets.applyShadowPreset(presets.createDefaultState().shadow, 'contact');
    assert.equal(shadow.preset, 'contact');
    assert.equal(shadow.contact.enabled, true);
    assert.equal(shadow.drop.enabled, false);
    const st = presets.createDefaultState({ layout: { ratio: '1:1' }, shadow: { contact: { enabled: true } } });
    assert.equal(st.layout.ratio, '1:1');
    assert.equal(st.layout.subjectScale, 0.8); // 未覆盖的字段保留默认
    assert.equal(st.shadow.contact.enabled, true);
    assert.equal(st.shadow.contact.opacity, presets.SHADOW_DEFAULTS.contact.opacity);
});

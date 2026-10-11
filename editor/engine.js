/**
 * MiaoCut 后处理编辑器 —— Canvas 渲染引擎
 * ============================================================
 * 职责：给定「编辑器状态 + 抠图结果」，画出最终合成图。不碰 DOM（只用 canvas），不依赖框架。
 *
 * 一、双分辨率是怎么保证一致的
 *   状态里所有长度都是「相对值」：主体位置相对画布、阴影模糊/偏移相对主体高度。
 *   先按规则算出「导出尺寸」（computeExportSize），预览只是把同一构图整体缩小
 *   （PREVIEW_MAX_SIDE × dpr），所以预览看到的就是导出的缩小版，不会出现「预览好看、导出走样」。
 *
 * 二、图层顺序（从下到上）
 *   ① 背景  ② 阴影层（接地阴影 + 立体投影，合在一张离屏 canvas 里）  ③ 主体
 *   圆形裁切（人像头像）作用在最外层。
 *
 * 三、性能：为什么拖滑块能流畅
 *   - 主体「轮廓剪影」（纯黑填充的 alpha）按尺寸缓存，阴影反复用它，不用每次重新抠。
 *   - 阴影层按「尺寸 + 主体位置 + 阴影参数」缓存。只换背景时阴影层直接复用。
 *   - 虚化背景按尺寸缓存。
 *   - 预览和导出各用一份缓存：导出是一次性的，用完立即释放，不污染预览缓存。
 *   - 合并重绘（一帧只画一次）由 panel.js 负责，引擎本身是同步、无状态副作用的。
 *
 * 四、模糊为什么不用 ctx.filter
 *   Safari 对 canvas 的 ctx.filter 支持不完整（老版本直接忽略）。阴影统一用 shadowBlur 的
 *   「离屏投影」技巧：把剪影画到画布外很远的地方，只让它的影子通过 shadowOffsetX 落回画布。
 *   所有浏览器都支持，效果一致。虚化背景用「多级降采样再放大」，同样全平台一致。
 *
 * 加载方式：普通 <script>（需先加载 presets.js），挂到 window.MiaoCutEditor.engine；
 * Node 里 require 时导出纯函数，供单元测试。
 */
(function (root) {
    'use strict';

    const presets = (typeof module !== 'undefined' && module.exports)
        ? require('./presets.js')
        : root.MiaoCutEditor.presets;

    // ============================================================
    // 纯函数（不依赖 canvas，可在 Node 里直接单测）
    // ============================================================

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    /**
     * 分析抠图的 alpha 通道，得到：
     *   bbox      主体不透明区域的包围盒（用于居中、缩放，忽略四周透明空白）
     *   contact   每一列「贴地程度」0~1（长度 = bbox.width）。接地阴影最深的那条接触线按它来画
     *   footprint 贴地部分的左右范围（接地阴影的椭圆宽度以它为准）
     *
     * 为什么要逐列算贴地程度：
     *   - 马克杯：杯把让 bbox 变宽，但真正贴地的只有杯底，阴影不该比杯底宽
     *   - 运动鞋：鞋跟和前掌着地，足弓和鞋尖是翘起来的。只画一个居中椭圆的话，
     *     鞋跟（在椭圆边缘）几乎没有阴影，看起来像悬空；逐列判断就能在每个着地点都压出暗线
     *
     * @param {Uint8ClampedArray} data  RGBA 像素（getImageData().data）
     * @param {number} width
     * @param {number} height
     * @returns {{ bbox: {x,y,width,height}, ground: number, touchesBottom: boolean, contact: Float32Array, footprint: {x0,x1} }}
     */
    function analyzeAlpha(data, width, height) {
        const BBOX_ALPHA = 8;       // alpha > 8 才算主体（过滤掉几乎透明的噪点）
        const SOLID_ALPHA = 64;     // 算贴地时更严格，忽略半透明的边缘羽化

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < height; y += 1) {
            const row = y * width * 4;
            for (let x = 0; x < width; x += 1) {
                if (data[row + x * 4 + 3] > BBOX_ALPHA) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        // 全透明（极少见，比如模型什么都没抠出来）：退化为整张图、整条底边都算贴地
        if (maxX < 0) {
            return {
                bbox: { x: 0, y: 0, width, height },
                ground: height - 1,
                touchesBottom: false,
                contact: new Float32Array(width).fill(1),
                footprint: { x0: 0, x1: width - 1 },
            };
        }

        const bbox = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };

        // ---- 底部轮廓：每一列最下面一个「实心」像素的 y ----
        // 从底往上扫，找到就停，所以实际只扫了主体下沿附近，开销很小。
        const bottom = new Int32Array(bbox.width).fill(-1);
        let ground = -1; // 实心像素的最低点 = 地面线
        for (let i = 0; i < bbox.width; i += 1) {
            const x = minX + i;
            for (let y = maxY; y >= minY; y -= 1) {
                if (data[(y * width + x) * 4 + 3] > SOLID_ALPHA) {
                    bottom[i] = y;
                    if (y > ground) ground = y;
                    break;
                }
            }
        }

        // 整个主体都是半透明（比如玻璃杯、烟雾）：没有实心像素，退化为包围盒底边、整条都算贴地
        if (ground < 0) {
            return {
                bbox,
                ground: maxY,
                touchesBottom: maxY >= height - 2,
                contact: new Float32Array(bbox.width).fill(1),
                footprint: { x0: minX, x1: maxX },
            };
        }

        // ---- 贴地程度：离地面线越近越接近 1，超过主体高度 4% 就算离地（0） ----
        // 平方让过渡更陡：真正着地的地方深，稍微翘起的地方迅速变淡
        const lift = Math.max(2, bbox.height * 0.04);
        const contact = new Float32Array(bbox.width);
        let fx0 = -1;
        let fx1 = -1;
        for (let i = 0; i < bbox.width; i += 1) {
            if (bottom[i] < 0) continue;
            const t = clamp(1 - (ground - bottom[i]) / lift, 0, 1);
            contact[i] = t * t;
            if (contact[i] > 0.2) {
                if (fx0 < 0) fx0 = i;
                fx1 = i;
            }
        }
        const footprint = fx0 < 0
            ? { x0: minX, x1: maxX }
            : { x0: minX + fx0, x1: minX + fx1 };
        // ground：实心像素最低的那一行（地面线）。不直接用 bbox 底边，是因为底部可能挂着
        // 一圈很淡的半透明羽化，用它当地面会让阴影和主体之间出现一条缝。
        //
        // touchesBottom：主体被原图底边截断（半身人像、只拍到上半身的宠物）。
        // 这种主体不能悬空居中，也不该画接地阴影，渲染时要贴着画布底边放（见 computeSubjectRect）。
        const touchesBottom = ground >= height - 2;
        return { bbox, ground, touchesBottom, contact, footprint };
    }

    function isOriginalRatio(ratioId) {
        const found = presets.RATIOS.find((r) => r.id === ratioId);
        return !found || found.value == null;
    }

    /**
     * 原图画幅下，让主体回到「原图里原位置」所需的偏移（相对画布宽高，和 layout.offsetX/Y 同单位）。
     * 面板切到原图画幅时，把 subjectScale 设为 1、offset 设为这个值，就是原图构图。
     */
    function computeOriginalOffset(bbox, image) {
        return {
            x: (bbox.x + bbox.width / 2) / image.width - 0.5,
            y: (bbox.y + bbox.height / 2) / image.height - 0.5,
        };
    }

    /** 画幅 id → 宽高比数值；original 用抠图原图的宽高比 */
    function resolveRatio(ratioId, imageWidth, imageHeight) {
        const found = presets.RATIOS.find((r) => r.id === ratioId);
        if (!found || found.value == null) return imageWidth / imageHeight;
        return found.value;
    }

    /**
     * 计算导出画布尺寸（像素）。
     *
     * 画幅 = original（原图）：画布就是抠图原图的尺寸，保持原尺寸、原构图。
     *   指定了固定长边就等比缩放到该长边；不做最小长边放大（原图多大就导出多大）。
     *
     * 其他画幅：主体按 1:1 原像素画上去，不放大、不浪费。
     *   1. 主体占比为 s 时，画布至少要 bbox.width / s 宽、bbox.height / s 高
     *   2. 再按目标宽高比 r 把短的那边补齐
     *   3. 指定了固定长边（1080 / 2000）就整体缩放到该长边
     *      否则长边小于 minLongSide 时放大（防止小 logo 导出成小图）
     *   4. 最后按长边上限 / 总像素上限整体缩小（iOS Safari 超限会画成空白）
     *
     * @param {{width,height}} bbox  主体包围盒（抠图像素）
     * @param {object} layout        state.layout
     * @param {{width,height}} image 抠图原始尺寸（用于 original 比例）
     * @returns {{width:number, height:number}}
     */
    function computeExportSize(bbox, layout, image) {
        const limits = presets.EXPORT_LIMITS;
        const isOriginal = isOriginalRatio(layout.ratio);
        let width;
        let height;
        if (isOriginal) {
            width = image.width;
            height = image.height;
        } else {
            const ratio = resolveRatio(layout.ratio, image.width, image.height);
            const s = clamp(layout.subjectScale || 1, 0.3, 1);
            width = Math.max(bbox.width / s, (bbox.height / s) * ratio);
            height = width / ratio;
        }

        const sizePreset = presets.EXPORT_SIZES.find((x) => x.id === layout.exportSize);
        const fixedLongSide = sizePreset && sizePreset.longSide;
        const longSide = Math.max(width, height);
        if (fixedLongSide) {
            const k = fixedLongSide / longSide;
            width *= k;
            height *= k;
        } else if (!isOriginal && longSide < limits.minLongSide) {
            const k = limits.minLongSide / longSide;
            width *= k;
            height *= k;
        }

        const shrink = Math.min(
            1,
            limits.maxSide / Math.max(width, height),
            Math.sqrt(limits.maxPixels / (width * height))
        );
        return {
            width: Math.max(1, Math.round(width * shrink)),
            height: Math.max(1, Math.round(height * shrink)),
        };
    }

    /**
     * 主体在画布上的位置和大小，再按 offsetX / offsetY 平移（相对画布宽高，0 = 居中）。
     *
     *   - 其他画幅：把 bbox 等比缩放进「画布 × 主体占比」的框里（subjectScale = 主体占画布比例）
     *   - original：主体大小 = 原图里的大小 × subjectScale（1 = 原大小）。
     *     配合 computeOriginalOffset 给出的偏移，就是原图里的原位置
     *
     * 预览和导出都调这个函数，只是传入的画布尺寸不同，所以构图完全一致。
     *
     * anchorBottom = true（主体被原图底边截断，比如半身人像）：主体底边贴住画布底边，
     * 只允许水平偏移；否则截断处会悬在画布中间，一眼假。
     *
     * @param {{width,height}} [image] 抠图原始尺寸，original 画幅时必传
     */
    function computeSubjectRect(bbox, canvasWidth, canvasHeight, layout, anchorBottom, image) {
        const s = clamp(layout.subjectScale || 1, 0.3, 1);
        const scale = isOriginalRatio(layout.ratio) && image
            ? (canvasWidth / image.width) * s
            : Math.min((canvasWidth * s) / bbox.width, (canvasHeight * s) / bbox.height);
        const width = bbox.width * scale;
        const height = bbox.height * scale;
        const cx = canvasWidth * (0.5 + clamp(layout.offsetX || 0, -0.5, 0.5));
        const cy = canvasHeight * (0.5 + clamp(layout.offsetY || 0, -0.5, 0.5));
        const y = anchorBottom ? canvasHeight - height : cy - height / 2;
        return { x: cx - width / 2, y, width, height, scale, anchorBottom: !!anchorBottom };
    }

    /**
     * 下载文件名：miaocut-[原文件名]-[比例].[扩展名]
     * 原文件名去掉扩展名，替换掉文件系统不允许的字符，限制长度（中文名保留）。
     */
    function buildFileName(basename, ratioId, format) {
        const ratio = presets.RATIOS.find((r) => r.id === ratioId) || presets.RATIOS[0];
        const ext = format === 'jpg' ? 'jpg' : (format === 'webp' ? 'webp' : 'png');
        const safe = String(basename || 'image')
            .replace(/\.[^.]+$/, '')
            .replace(/[\\/:*?"<>|%#\u0000-\u001f]+/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .slice(0, 60) || 'image';
        return `miaocut-${safe}-${ratio.fileLabel}.${ext}`;
    }

    // ============================================================
    // Canvas 绘制
    // ============================================================

    function defaultCreateCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    /** 把 canvas 尺寸设为 0，立即释放显存/内存（iOS Safari 对 canvas 总内存很敏感） */
    function releaseCanvas(canvas) {
        if (!canvas) return;
        canvas.width = 0;
        canvas.height = 0;
    }

    /**
     * 「离屏投影」画模糊剪影：
     *   把 src 画到画布左边很远（x - FAR）的地方，再设 shadowOffsetX = FAR，
     *   于是 src 本体落在画布外看不见，只有它的模糊影子落回 (x, y)。
     *   shadowColor 的 alpha 就是阴影浓度；src 必须是不透明的黑色剪影。
     *
     * 注意：shadowOffset / shadowBlur 不受 ctx 变换矩阵影响，所以调用前要保证是单位矩阵。
     */
    function drawBlurred(ctx, src, x, y, width, height, blurPx, opacity) {
        if (opacity <= 0 || width < 1 || height < 1) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (blurPx < 0.5) {
            // 模糊太小就没必要走投影，直接按透明度画
            ctx.globalAlpha = opacity;
            ctx.drawImage(src, x, y, width, height);
        } else {
            const far = ctx.canvas.width + width + blurPx * 4 + 100;
            ctx.shadowColor = `rgba(0,0,0,${opacity})`;
            ctx.shadowBlur = blurPx;
            ctx.shadowOffsetX = far;
            ctx.shadowOffsetY = 0;
            ctx.drawImage(src, x - far, y, width, height);
        }
        ctx.restore();
    }

    /**
     * 创建一个编辑器渲染引擎实例。
     *
     * @param {object} sources
     * @param {HTMLImageElement|HTMLCanvasElement} sources.cutout   后端返回的透明 PNG
     * @param {HTMLImageElement|HTMLCanvasElement} [sources.original] 用户原图（虚化背景用）
     * @param {string} [sources.basename] 原文件名（下载命名用）
     * @param {object} [options]
     * @param {(w:number,h:number)=>HTMLCanvasElement} [options.createCanvas] 便于测试注入
     */
    function createEngine(sources, options) {
        const createCanvas = (options && options.createCanvas) || defaultCreateCanvas;
        const cutout = sources.cutout;
        const original = sources.original || null;
        const basename = sources.basename || 'image';
        const imageWidth = cutout.naturalWidth || cutout.width;
        const imageHeight = cutout.naturalHeight || cutout.height;

        // ---- 一次性分析 alpha（2048² 实测约 27ms，只在创建时做一次） ----
        const analysis = (function () {
            const c = createCanvas(imageWidth, imageHeight);
            const cctx = c.getContext('2d', { willReadFrequently: true });
            cctx.drawImage(cutout, 0, 0);
            const { data } = cctx.getImageData(0, 0, imageWidth, imageHeight);
            const result = analyzeAlpha(data, imageWidth, imageHeight);
            releaseCanvas(c);
            return result;
        })();
        const bbox = analysis.bbox;
        const footprint = analysis.footprint;
        const groundRow = analysis.ground;
        const imageSize = { width: imageWidth, height: imageHeight };
        const touchesBottom = analysis.touchesBottom;

        // ---- 接触线条带：1px 高、bbox 宽的黑条，alpha = 每列的贴地程度 ----
        // 画接地阴影时把它横向拉到主体宽度、纵向拉成几像素厚再模糊，
        // 就得到一条「只在真正着地的地方才深」的接触暗线。创建一次，预览和导出共用（只读）。
        const contactStrip = (function () {
            const c = createCanvas(bbox.width, 1);
            const cctx = c.getContext('2d');
            const img = cctx.createImageData(bbox.width, 1);
            for (let i = 0; i < bbox.width; i += 1) img.data[i * 4 + 3] = Math.round(analysis.contact[i] * 255);
            cctx.putImageData(img, 0, 0);
            return c;
        })();

        // ---- 缓存：每个槽位只留最新一份（LRU-1），key 变了就释放旧 canvas ----
        function createCache() {
            return { cast: null, shadow: null, blurBg: null };
        }
        function cacheGet(cache, slot, key) {
            const entry = cache[slot];
            return entry && entry.key === key ? entry.canvas : null;
        }
        function cacheSet(cache, slot, key, canvas) {
            const old = cache[slot];
            if (old && old.canvas !== canvas) releaseCanvas(old.canvas);
            cache[slot] = { key, canvas };
            return canvas;
        }
        function releaseCache(cache) {
            Object.keys(cache).forEach((slot) => {
                if (cache[slot]) releaseCanvas(cache[slot].canvas);
                cache[slot] = null;
            });
        }
        let previewCache = createCache();

        // ---- 主体剪影：主体 alpha + 纯黑填充 ----
        // 只按抠图原始分辨率（bbox 尺寸）生成一次，之后预览 / 导出都缩放使用。
        // 早期版本按显示尺寸缓存，拖「主体缩放」滑块时每帧都要重新生成，Retina 屏上一帧 30ms+；
        // 改成生成一次后，缩放滑块只需重画阴影层（benchmark 见 PR 描述）。
        let silhouetteCanvas = null;
        function getSilhouette() {
            if (silhouetteCanvas) return silhouetteCanvas;
            const c = createCanvas(bbox.width, bbox.height);
            const cctx = c.getContext('2d');
            cctx.drawImage(cutout, bbox.x, bbox.y, bbox.width, bbox.height, 0, 0, bbox.width, bbox.height);
            // source-in：只保留已有像素的形状，颜色全部换成黑色
            cctx.globalCompositeOperation = 'source-in';
            cctx.fillStyle = '#000';
            cctx.fillRect(0, 0, bbox.width, bbox.height);
            silhouetteCanvas = c;
            return c;
        }

        // ---- 背景 ----
        function drawBackground(ctx, background, W, H, cache) {
            const type = background.type;
            if (type === 'transparent') return;

            if (type === 'solid') {
                ctx.fillStyle = background.color || '#FFFFFF';
                ctx.fillRect(0, 0, W, H);
                return;
            }

            if (type === 'gradient') {
                const g = presets.GRADIENTS.find((x) => x.id === background.gradientId) || presets.GRADIENTS[0];
                let grad;
                if (g.kind === 'radial') {
                    const cx = g.cx * W;
                    const cy = g.cy * H;
                    grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, g.r * Math.max(W, H));
                } else {
                    grad = ctx.createLinearGradient(g.x0 * W, g.y0 * H, g.x1 * W, g.y1 * H);
                }
                g.stops.forEach(([pos, color]) => grad.addColorStop(pos, color));
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, W, H);
                return;
            }

            if (type === 'blur' && original) {
                ctx.drawImage(getBlurredOriginal(cache, W, H), 0, 0, W, H);
                // 盖一层半透明白，让主体更突出
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(0, 0, W, H);
                return;
            }

            if (type === 'image' && background.image && background.image.img) {
                drawCover(ctx, background.image.img, W, H, background.image);
                return;
            }

            // 未知类型 / 缺素材：退回白底，保证导出不会是意外的透明
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, W, H);
        }

        /** 背景图 cover 铺满，支持放大（scale ≥ 1）和拖动偏移（相对画布，自动限制在不露边的范围） */
        function drawCover(ctx, img, W, H, opts) {
            const iw = img.naturalWidth || img.width;
            const ih = img.naturalHeight || img.height;
            const scale = Math.max(W / iw, H / ih) * Math.max(1, opts.scale || 1);
            const dw = iw * scale;
            const dh = ih * scale;
            const maxX = Math.max(0, (dw - W) / 2);
            const maxY = Math.max(0, (dh - H) / 2);
            const ox = clamp((opts.offsetX || 0) * W, -maxX, maxX);
            const oy = clamp((opts.offsetY || 0) * H, -maxY, maxY);
            ctx.drawImage(img, (W - dw) / 2 + ox, (H - dh) / 2 + oy, dw, dh);
        }

        /**
         * 虚化原图背景：多级降采样再逐级放大。
         * 一次性从大图缩到很小再放大会出现马赛克/菱形块，逐级（每次 ×1/4 或 ×4）做平滑得多；
         * 效果近似高斯模糊，且不依赖 ctx.filter（Safari 兼容）。按画布尺寸缓存。
         */
        function getBlurredOriginal(cache, W, H) {
            const key = `${W}x${H}`;
            const hit = cacheGet(cache, 'blurBg', key);
            if (hit) return hit;

            // 先 cover 到画布比例的一张中等图（长边 512），再缩到长边 ~24px
            const mid = Math.min(1, 512 / Math.max(W, H));
            let w = Math.max(1, Math.round(W * mid));
            let h = Math.max(1, Math.round(H * mid));
            let current = createCanvas(w, h);
            drawCover(current.getContext('2d'), original, w, h, { scale: 1.08 });

            const steps = [];
            while (Math.max(w, h) > 24) {
                w = Math.max(1, Math.round(w / 4));
                h = Math.max(1, Math.round(h / 4));
                const next = createCanvas(w, h);
                const nctx = next.getContext('2d');
                nctx.imageSmoothingQuality = 'high';
                nctx.drawImage(current, 0, 0, w, h);
                steps.push(current);
                current = next;
            }
            // 逐级放大回去（反向走一遍降采样的尺寸）
            for (let i = steps.length - 1; i >= 0; i -= 1) {
                const target = steps[i];
                const tctx = target.getContext('2d');
                tctx.imageSmoothingQuality = 'high';
                tctx.clearRect(0, 0, target.width, target.height);
                tctx.drawImage(current, 0, 0, target.width, target.height);
                if (current !== target) releaseCanvas(current);
                current = target;
            }
            return cacheSet(cache, 'blurBg', key, current);
        }

        // ---- 阴影 ----

        /**
         * 接地阴影 = 三层叠加（从远到近）：
         *
         *  ① 地面投影（cast）：把主体剪影上下翻转、压扁成 squash × 主体高度，贴在地面线下方，
         *     再从「贴地处浓 → 远处淡」渐隐并模糊。形状跟着主体走（瓶子、鞋子、杯子各不相同），
         *     这是和「千篇一律的椭圆」拉开差距的关键。
         *
         *  ② 环境暗部（ambient）：以贴地范围（footprint）为宽度的大而淡的压扁椭圆，
         *     模拟物体挡住环境光后地面整体变暗的那一片半影。
         *
         *  ③ 接触线（contact line）：只在逐列判断为「着地」的位置画一条很薄、很深的暗线。
         *     运动鞋的鞋跟和前掌、桌子的四条腿都会各自压出暗线，足弓等翘起处不会。
         *
         * 地面线用 alpha 分析得到的「实心像素最低行」，而不是包围盒底边（见 analyzeAlpha 注释）。
         */
        function drawContactShadow(ctx, rect, contact, cache) {
            const opacity = clamp(contact.opacity, 0, 1);
            if (opacity <= 0) return;
            const softness = clamp(contact.softness, 0, 1);
            const k = rect.scale;
            const groundY = rect.y + (groundRow + 1 - bbox.y) * k;

            // ---- ① 地面投影 ----
            const squash = clamp(contact.squash, 0, 0.5);
            const castH = rect.height * squash;
            if (castH >= 1) {
                const w = Math.max(1, Math.round(rect.width));
                const h = Math.max(1, Math.round(castH));
                const key = `${w}x${h}`;
                let cast = cacheGet(cache, 'cast', key);
                if (!cast) {
                    cast = createCanvas(w, h);
                    const cctx = cast.getContext('2d');
                    const silhouette = getSilhouette();
                    // 上下翻转：主体底部（贴地）画在 cast 顶部，主体顶部画在最远处
                    cctx.setTransform(1, 0, 0, -1, 0, h);
                    cctx.drawImage(silhouette, 0, 0, w, h);
                    cctx.setTransform(1, 0, 0, 1, 0, 0);
                    // 渐隐：贴地处保留 100%，远端只剩 10%
                    const fade = cctx.createLinearGradient(0, 0, 0, h);
                    fade.addColorStop(0, 'rgba(0,0,0,1)');
                    fade.addColorStop(1, 'rgba(0,0,0,0.1)');
                    cctx.globalCompositeOperation = 'destination-in';
                    cctx.fillStyle = fade;
                    cctx.fillRect(0, 0, w, h);
                    cacheSet(cache, 'cast', key, cast);
                }
                const castBlur = rect.height * (0.008 + 0.04 * softness);
                // 往上叠 2% 让投影和主体底边无缝衔接（不会出现一条亮缝）
                drawBlurred(ctx, cast, rect.x, groundY - castH * 0.02, rect.width, castH, castBlur, opacity * 0.5);
            }

            // ---- ② 环境暗部 ----
            const fx0 = rect.x + (footprint.x0 - bbox.x) * k;
            const fx1 = rect.x + (footprint.x1 + 1 - bbox.x) * k;
            const footWidth = Math.max(fx1 - fx0, rect.width * 0.15);
            const rx = (footWidth * clamp(contact.spread, 0.3, 2)) / 2;
            // 椭圆的扁平度：越柔越「厚」；同时保证至少有主体高度 0.8% 的厚度
            const ry = Math.max(rx * (0.08 + 0.12 * softness), rect.height * 0.008);
            drawEllipseShadow(ctx, (fx0 + fx1) / 2, groundY - ry * 0.25, rx, ry, opacity * 0.6, [
                [0, 1], [0.4, 0.55], [0.75, 0.18], [1, 0],
            ]);

            // ---- ③ 接触线 ----
            // 厚度约主体高度 1.2%，中心压在地面线上（上半截被主体挡住，只露出下半截）
            const lineH = Math.max(1.5, rect.height * 0.012);
            const lineBlur = rect.height * (0.004 + 0.016 * softness);
            drawBlurred(ctx, contactStrip, rect.x, groundY - lineH / 2, rect.width, lineH, lineBlur, opacity * 0.9);
        }

        /** 画一个压扁的径向渐变椭圆：先画圆形渐变，再用 scale 把 Y 轴压扁成椭圆 */
        function drawEllipseShadow(ctx, cx, cy, rx, ry, opacity, stops) {
            if (rx < 0.5 || ry < 0.1) return;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1, ry / rx);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
            stops.forEach(([pos, alpha]) => grad.addColorStop(pos, `rgba(0,0,0,${opacity * alpha})`));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /** 立体投影：沿主体轮廓的模糊投影，模糊和偏移都按主体高度换算成像素 */
        function drawDropShadow(ctx, rect, drop, cache) {
            const opacity = clamp(drop.opacity, 0, 1);
            if (opacity <= 0) return;
            const silhouette = getSilhouette();
            const blurPx = rect.height * clamp(drop.blur, 0, 0.3);
            const dx = rect.height * clamp(drop.offsetX, -0.5, 0.5);
            const dy = rect.height * clamp(drop.offsetY, -0.5, 0.5);
            drawBlurred(ctx, silhouette, rect.x + dx, rect.y + dy, rect.width, rect.height, blurPx, opacity);
        }

        /**
         * 阴影层：接地阴影 + 立体投影画在同一张离屏 canvas 上，按参数缓存。
         * 只换背景 / 改导出格式时直接复用，拖阴影滑块时才重画。
         */
        function getShadowLayer(cache, shadow, rect, W, H) {
            const dropOn = shadow.drop && shadow.drop.enabled;
            // 主体贴着画布底边时，接地阴影会画到画布外（且被截断的主体本来就没有「地面」），直接跳过
            const contactOn = shadow.contact && shadow.contact.enabled && !rect.anchorBottom;
            if (!dropOn && !contactOn) return null;

            const key = JSON.stringify([
                W, H,
                Math.round(rect.x * 10), Math.round(rect.y * 10), Math.round(rect.width * 10),
                dropOn ? shadow.drop : 0,
                contactOn ? shadow.contact : 0,
            ]);
            const hit = cacheGet(cache, 'shadow', key);
            if (hit) return hit;

            const old = cache.shadow;
            // 尺寸没变就复用旧 canvas（省一次分配），否则新建
            const layer = old && old.canvas.width === W && old.canvas.height === H
                ? old.canvas
                : createCanvas(W, H);
            const lctx = layer.getContext('2d');
            lctx.setTransform(1, 0, 0, 1, 0, 0);
            lctx.clearRect(0, 0, W, H);
            if (contactOn) drawContactShadow(lctx, rect, shadow.contact, cache);
            if (dropOn) drawDropShadow(lctx, rect, shadow.drop, cache);
            return cacheSet(cache, 'shadow', key, layer);
        }

        // ---- 合成 ----

        function drawComposition(ctx, state, W, H, cache) {
            const rect = computeSubjectRect(bbox, W, H, state.layout, touchesBottom, imageSize);

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, W, H);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            if (state.layout.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(W / 2, H / 2, Math.min(W, H) / 2, 0, Math.PI * 2);
                ctx.clip();
            }

            drawBackground(ctx, state.background, W, H, cache);

            const shadowLayer = getShadowLayer(cache, state.shadow, rect, W, H);
            if (shadowLayer) ctx.drawImage(shadowLayer, 0, 0);

            ctx.drawImage(cutout, bbox.x, bbox.y, bbox.width, bbox.height, rect.x, rect.y, rect.width, rect.height);
            ctx.restore();
            return rect;
        }

        // ============================================================
        // 对外 API
        // ============================================================

        /** 导出尺寸 + 主体在导出画布上的位置（面板显示尺寸、做拖拽命中判断用） */
        function getLayout(state) {
            const size = computeExportSize(bbox, state.layout, imageSize);
            const rect = computeSubjectRect(bbox, size.width, size.height, state.layout, touchesBottom, imageSize);
            return { width: size.width, height: size.height, subject: rect };
        }

        /**
         * 渲染预览：整体按比例缩小到 maxSide × dpr（dpr 最多按 2 算，3 倍屏没必要多付出 2 倍算力）。
         * canvas 尺寸不变时不重设 width/height（重设会清空并重新分配内存）。
         *
         * 拖动中（interactive = true）强制按 dpr = 1 画：Retina 屏上 dpr=2 的画布像素是 4 倍，
         * 拖「主体缩放」时一帧要 ~30ms，掉到 30fps；按 dpr=1 画只要 ~4ms。
         * 松手后面板再以 interactive = false 补一帧高清，用户几乎察觉不到切换。
         *
         * @param {HTMLCanvasElement} canvas  页面上的预览 canvas
         * @param {object} state
         * @param {{maxSide?:number, dpr?:number, interactive?:boolean}} [opts]
         * @returns {{width, height, exportWidth, exportHeight, subject, previewScale}}
         */
        function renderPreview(canvas, state, opts) {
            const maxSide = (opts && opts.maxSide) || presets.PREVIEW_MAX_SIDE;
            const dpr = (opts && opts.interactive) ? 1 : clamp((opts && opts.dpr) || 1, 1, 2);
            const size = computeExportSize(bbox, state.layout, imageSize);
            const scale = Math.min(1, (maxSide * dpr) / Math.max(size.width, size.height));
            const W = Math.max(1, Math.round(size.width * scale));
            const H = Math.max(1, Math.round(size.height * scale));
            if (canvas.width !== W || canvas.height !== H) {
                canvas.width = W;
                canvas.height = H;
            }
            const rect = drawComposition(canvas.getContext('2d'), state, W, H, previewCache);
            return {
                width: W,
                height: H,
                exportWidth: size.width,
                exportHeight: size.height,
                subject: rect,
                previewScale: scale,
            };
        }

        /**
         * 高清导出：在导出尺寸的离屏 canvas 上重新完整绘制一遍（用独立缓存，画完全部释放）。
         *
         *  - JPG 没有透明通道：背景透明时先铺 jpgMatte（默认白），否则透明区域会变成黑色
         *  - WebP：老版 Safari 的 toBlob 不支持 webp，会静默返回 PNG。这里检查实际 blob.type，
         *    不一致就把格式改回 png（文件扩展名也跟着改），避免出现「.webp 文件里装的是 PNG」
         *
         * @returns {Promise<{blob: Blob, filename: string, width: number, height: number, format: string}>}
         */
        function exportImage(state) {
            const size = computeExportSize(bbox, state.layout, imageSize);
            const W = size.width;
            const H = size.height;
            const format = state.export.format || 'png';
            const mime = format === 'jpg' ? 'image/jpeg' : (format === 'webp' ? 'image/webp' : 'image/png');

            const canvas = createCanvas(W, H);
            const ctx = canvas.getContext('2d');
            const cache = createCache();
            try {
                if (format === 'jpg') {
                    // 先画 composition 到透明画布，再垫底色：保证圆形裁切外、透明背景处都是底色
                    drawComposition(ctx, state, W, H, cache);
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = state.export.jpgMatte || '#FFFFFF';
                    ctx.fillRect(0, 0, W, H);
                    ctx.restore();
                } else {
                    drawComposition(ctx, state, W, H, cache);
                }
            } finally {
                releaseCache(cache);
            }

            const quality = format === 'png' ? undefined : clamp(state.export.quality || 0.92, 0.5, 1);
            return new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    releaseCanvas(canvas);
                    if (!blob) {
                        reject(new Error('Export failed'));
                        return;
                    }
                    let actualFormat = format;
                    if (blob.type !== mime) actualFormat = blob.type === 'image/jpeg' ? 'jpg' : 'png';
                    resolve({
                        blob,
                        filename: buildFileName(basename, state.layout.ratio, actualFormat),
                        width: W,
                        height: H,
                        format: actualFormat,
                    });
                }, mime, quality);
            });
        }

        /** 释放所有缓存（离开编辑器 / 换图时调用） */
        function dispose() {
            releaseCache(previewCache);
            previewCache = createCache();
            releaseCanvas(contactStrip);
            releaseCanvas(silhouetteCanvas);
            silhouetteCanvas = null;
        }

        return {
            bbox,
            footprint,
            touchesBottom,
            // 原图画幅下主体回到原位置所需的 offset（面板切到「原图」时用）
            originalOffset: computeOriginalOffset(bbox, imageSize),
            imageWidth,
            imageHeight,
            getLayout,
            renderPreview,
            exportImage,
            dispose,
        };
    }

    const engine = {
        createEngine,
        // 以下纯函数导出给面板和单元测试用
        analyzeAlpha,
        computeExportSize,
        computeSubjectRect,
        computeOriginalOffset,
        resolveRatio,
        buildFileName,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = engine;
    } else {
        root.MiaoCutEditor = root.MiaoCutEditor || {};
        root.MiaoCutEditor.engine = engine;
    }
})(typeof window !== 'undefined' ? window : globalThis);

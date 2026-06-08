#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从「本次改动的文件列表」算出需要提交给 IndexNow 的 URL。

输入：改动的文件路径，逐行从 stdin 读入（一般来自 `git diff --name-only <before> <after>`），
      也可以作为命令行参数传入（方便本地手测）。
输出：需要提交的 URL，逐行打印到 stdout（去重，保持出现顺序）。

为什么能精确算出「变了哪些页面」
--------------------------------
Cloudflare Pages 用目录式路由 serve：`<目录>/index.html` 对应 URL `/<目录>/`，
根目录 `index.html` 对应 `/`。站点所有可索引页面都是 `index.html`
（见 scripts/build-i18n.mjs 的 PAGES / EN_ONLY_PAGES）。

而生成的 `zh/*/index.html` 是「提交进仓库的产物」——只有内容真的变了，git diff
里才会出现对应的 index.html。所以「哪些 URL 变了」== 「哪些 index.html 在 diff 里」，
中文页天然被覆盖，不用任何特殊处理。

映射规则
--------
- 只认文件名为 `index.html` 的改动，去掉结尾 `index.html` 保留目录前缀（含可能的 `zh/`）。
- 把候选 URL 与 sitemap.xml 里的 `<loc>` 取交集，避免把「不该被索引的零散 index.html」
  （万一将来仓库里出现）误报上去。sitemap 就是这个站点可索引 URL 的唯一权威清单。

非 index.html 的改动（output.css / app.js / 后端 *.py / 站点校验文件 / sitemap.xml 本身）
一律忽略：纯样式/脚本变化不改可索引内容；真有页面内容变化时，对应的 index.html 一定也变了。

注意：编辑 EN 首页/子页里「内联的 zh 字典」会改到 EN 那个 index.html 的字节，于是 EN URL
也会被算进来——即便 EN 页面对爬虫可见的内容没变。这是文件级 diff 的固有粒度，属于无害的
轻微多报（重复提交同一个 URL 对 IndexNow 完全安全），不值得为它引入易碎的语义级 diff。
"""

import os
import re
import sys

ORIGIN = "https://miaocut.app"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def file_to_url(path):
    """把仓库内文件路径映射成它对外 serve 的 URL；不是页面文件则返回 None。"""
    p = path.strip().lstrip("./").strip("/")
    if p != "index.html" and not p.endswith("/index.html"):
        return None
    # 去掉结尾的 'index.html'，剩下的目录前缀（'foo/bar/' 或 '' 表示根）就是 URL 路径
    dir_prefix = p[: -len("index.html")]
    return ORIGIN + "/" + dir_prefix


def load_sitemap_urls():
    """读 sitemap.xml 里的所有 <loc> 作为「可索引 URL 白名单」。"""
    sitemap_path = os.path.join(ROOT, "sitemap.xml")
    with open(sitemap_path, "r", encoding="utf-8") as f:
        return set(re.findall(r"<loc>(.*?)</loc>", f.read()))


def main():
    # 改动文件：优先取命令行参数，否则从 stdin 逐行读
    if len(sys.argv) > 1:
        changed = sys.argv[1:]
    else:
        changed = sys.stdin.read().splitlines()

    allow = load_sitemap_urls()

    seen = set()
    out = []
    for f in changed:
        url = file_to_url(f)
        if url and url in allow and url not in seen:
            seen.add(url)
            out.append(url)

    for url in out:
        print(url)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

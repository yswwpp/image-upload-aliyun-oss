#!/bin/bash

# Obsidian 插件调试脚本

PLUGIN_NAME="image-upload-aliyun-oss"
PLUGIN_DIR="/Users/yswwpp/note_ysw/.obsidian/plugins/$PLUGIN_NAME"

echo "========================================"
echo "  Obsidian 插件调试工具"
echo "========================================"
echo ""

# 检查插件目录
echo "[1] 检查插件目录..."
if [ -d "$PLUGIN_DIR" ]; then
    echo "  ✓ 目录存在：$PLUGIN_DIR"
    ls -lh "$PLUGIN_DIR"
else
    echo "  ✗ 目录不存在：$PLUGIN_DIR"
    exit 1
fi

echo ""

# 检查必需文件
echo "[2] 检查必需文件..."
for file in main.js manifest.json; do
    if [ -f "$PLUGIN_DIR/$file" ]; then
        echo "  ✓ $file ($(ls -lh "$PLUGIN_DIR/$file" | awk '{print $5}'))"
    else
        echo "  ✗ $file 不存在"
    fi
done

echo ""

# 检查 manifest.json
echo "[3] 检查 manifest.json..."
if command -v jq &> /dev/null; then
    jq '.' "$PLUGIN_DIR/manifest.json"
else
    cat "$PLUGIN_DIR/manifest.json"
fi

echo ""

# 检查 main.js 导出
echo "[4] 检查 main.js 导出..."
if grep -q "module.exports" "$PLUGIN_DIR/main.js"; then
    echo "  ✓ 找到 module.exports"
else
    echo "  ✗ 未找到 module.exports"
fi

if grep -q "AliyunOSSUploadPlugin" "$PLUGIN_DIR/main.js"; then
    echo "  ✓ 找到插件类 AliyunOSSUploadPlugin"
else
    echo "  ✗ 未找到插件类"
fi

echo ""

# 检查 obsidian API 使用
echo "[5] 检查 Obsidian API 使用..."
echo "  使用的 Obsidian API:"
grep -o "require(\"obsidian\")" "$PLUGIN_DIR/main.js" | wc -l | xargs -I {} echo "    - require('obsidian'): {} 次"

echo ""

# 提供 Obsidian 控制台查看提示
echo "[6] 查看 Obsidian 控制台错误..."
echo ""
echo "  请按以下步骤查看错误日志:"
echo ""
echo "  1. 打开 Obsidian"
echo "  2. 按下 Ctrl+Shift+I (macOS: Cmd+Option+I) 打开开发者工具"
echo "  3. 切换到 Console 标签"
echo "  4. 重新加载插件或重启 Obsidian"
echo "  5. 查看错误信息"
echo ""
echo "  常见错误:"
echo "    - Failed to load plugin: 插件入口类名不匹配"
echo "    - Cannot find module: 依赖缺失"
echo "    - process is not defined: 使用了 Node.js 特有 API"
echo ""

echo "========================================"
echo "  调试完成"
echo "========================================"

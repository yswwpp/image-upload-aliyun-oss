#!/bin/bash

#===============================================================================
# Aliyun OSS Image Upload - Obsidian Plugin Deploy Script
# 一键部署脚本 - 自动构建并复制插件到 Obsidian 插件目录
#===============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 插件名称
PLUGIN_NAME="image-upload-aliyun-oss"

# 全局变量
TARGET_DIR=""
UPDATE_MODE=""
CUSTOM_TARGET=""

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "windows"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# 获取系统默认 Obsidian 插件目录
get_default_obsidian_plugin_dir() {
    local os_type=$(detect_os)
    local plugin_dir=""
    
    case $os_type in
        macos)
            plugin_dir="$HOME/Library/Application Support/obsidian/.obsidian/plugins/$PLUGIN_NAME"
            ;;
        windows)
            plugin_dir="$APPDATA/obsidian/.obsidian/plugins/$PLUGIN_NAME"
            ;;
        linux)
            plugin_dir="$HOME/.config/obsidian/.obsidian/plugins/$PLUGIN_NAME"
            ;;
        *)
            print_error "不支持的操作系统：$os_type"
            exit 1
            ;;
    esac
    
    echo "$plugin_dir"
}

# 确定目标目录（优先级：参数 > 环境变量 > 系统默认）
determine_target_dir() {
    local target=""
    local source=""
    
    # 优先级 1: --target 参数
    if [ -n "$CUSTOM_TARGET" ]; then
        target="$CUSTOM_TARGET/$PLUGIN_NAME"
        source="命令行参数"
    # 优先级 2: OBSIDIAN_PLUGIN_DIR 环境变量
    elif [ -n "$OBSIDIAN_PLUGIN_DIR" ]; then
        target="$OBSIDIAN_PLUGIN_DIR/$PLUGIN_NAME"
        source="环境变量 OBSIDIAN_PLUGIN_DIR"
    # 优先级 3: 系统默认目录
    else
        target=$(get_default_obsidian_plugin_dir)
        source="系统默认目录"
    fi
    
    echo "$target|$source"
}

# 检查目录是否存在
check_directory() {
    local dir="$1"
    if [ -d "$dir" ]; then
        return 0
    else
        return 1
    fi
}

# 询问用户是否手动指定目录
ask_custom_directory() {
    echo ""
    print_warning "目标目录不存在：$1"
    echo ""
    echo "请选择操作:"
    echo "  1) 手动指定 Obsidian vault 的 .obsidian/plugins 目录"
    echo "  2) 创建系统默认目录"
    echo "  3) 取消部署"
    echo ""
    
    read -p "请输入选项 (1-3): " choice
    
    case $choice in
        1)
            read -p "请输入完整的插件目录路径: " custom_dir
            # 确保路径以插件名结尾
            if [[ "$custom_dir" != *"$PLUGIN_NAME" ]]; then
                custom_dir="$custom_dir/$PLUGIN_NAME"
            fi
            echo "$custom_dir"
            return 0
            ;;
        2)
            echo ""
            ;;
        3)
            print_info "部署已取消"
            exit 0
            ;;
        *)
            print_error "无效选项"
            exit 1
            ;;
    esac
}

# 检查 Node.js 和 npm
check_dependencies() {
    print_step "检查依赖项..."
    
    if ! command -v node &> /dev/null; then
        print_error "未找到 Node.js，请先安装 Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "未找到 npm，请先安装 npm"
        exit 1
    fi
    
    print_success "依赖项检查通过"
    print_info "  Node.js: $(node -v)"
    print_info "  npm: $(npm -v)"
}

# 构建项目
build_project() {
    print_step "开始构建项目..."
    
    if [ ! -f "package.json" ]; then
        print_error "未找到 package.json，请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        print_info "安装依赖项..."
        npm install
    fi
    
    # 执行构建
    if npm run build; then
        print_success "项目构建成功"
    else
        print_error "项目构建失败"
        exit 1
    fi
}

# 创建目标目录
create_target_dir() {
    local target_dir="$1"
    
    if [ ! -d "$target_dir" ]; then
        print_info "创建插件目录：$target_dir"
        mkdir -p "$target_dir"
    fi
}

# 复制文件
copy_files() {
    local target_dir="$1"
    local update_mode="$2"
    
    # 检查源文件是否存在
    if [ ! -f "main.js" ]; then
        print_error "未找到 main.js，请先构建项目"
        exit 1
    fi
    
    if [ ! -f "manifest.json" ]; then
        print_error "未找到 manifest.json"
        exit 1
    fi
    
    # 检查是否已存在插件文件
    if [ -f "$target_dir/main.js" ] && [ "$update_mode" != "force" ]; then
        print_warning "检测到已存在的插件文件"
        read -p "是否覆盖？(y/n): " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            print_info "部署已取消"
            exit 0
        fi
    fi
    
    # 复制文件
    print_info "复制插件文件..."
    cp "main.js" "$target_dir/"
    cp "manifest.json" "$target_dir/"
    
    # 复制样式文件（如果存在）
    if [ -f "styles.css" ]; then
        cp "styles.css" "$target_dir/"
        print_success "  + styles.css"
    fi
    
    print_success "  + main.js"
    print_success "  + manifest.json"
}

# 显示部署信息
show_deployment_info() {
    local target_dir="$1"
    local source_info="$2"
    
    echo ""
    echo "========================================"
    print_success "部署完成！"
    echo "========================================"
    echo ""
    print_info "目标目录：$target_dir"
    print_info "目录来源：$source_info"
    echo ""
    
    # 显示文件信息
    print_info "已部署文件:"
    ls -lh "$target_dir" | grep -E "(main.js|manifest.json|styles.css)" | while read line; do
        echo "    $line"
    done
    
    echo ""
    print_info "下一步操作:"
    echo "    1. 打开 Obsidian"
    echo "    2. 进入 设置 > 第三方插件"
    echo "    3. 找到 '$PLUGIN_NAME' 并启用"
    echo "    4. 配置阿里云 OSS 信息"
    echo ""
    
    # 如果是 macOS，提示可能需要重启 Obsidian
    local os_type=$(detect_os)
    if [ "$os_type" == "macos" ]; then
        print_warning "如果 Obsidian 正在运行，可能需要重启才能加载新插件"
    fi
}

# 主函数
main() {
    echo ""
    echo "========================================"
    echo "  Aliyun OSS Image Upload - Deploy"
    echo "========================================"
    echo ""
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--target)
                CUSTOM_TARGET="$2"
                shift 2
                ;;
            -f|--force)
                UPDATE_MODE="force"
                shift
                ;;
            -h|--help)
                echo "用法：$0 [选项]"
                echo ""
                echo "选项:"
                echo "  -t, --target DIR    指定 Obsidian 插件目录"
                echo "                      (优先级高于环境变量和默认目录)"
                echo "  -f, --force         强制更新，不询问确认"
                echo "  -h, --help          显示帮助信息"
                echo ""
                echo "环境变量:"
                echo "  OBSIDIAN_PLUGIN_DIR  指定 Obsidian 插件目录"
                echo "                       (优先级高于默认目录)"
                echo ""
                echo "目录优先级:"
                echo "  1. --target 参数"
                echo "  2. OBSIDIAN_PLUGIN_DIR 环境变量"
                echo "  3. 系统默认目录"
                echo ""
                echo "示例:"
                echo "  $0                                    # 使用默认目录"
                echo "  $0 --target /path/to/plugins          # 指定目录"
                echo "  $0 --force                            # 强制更新"
                echo "  OBSIDIAN_PLUGIN_DIR=/path $0          # 使用环境变量"
                echo ""
                exit 0
                ;;
            *)
                print_error "未知选项：$1"
                echo "使用 --help 查看帮助"
                exit 1
                ;;
        esac
    done
    
    # 确定目标目录
    local dir_info=$(determine_target_dir)
    local plugin_dir=$(echo "$dir_info" | cut -d'|' -f1)
    local dir_source=$(echo "$dir_info" | cut -d'|' -f2)
    
    print_info "检测到操作系统：$(detect_os)"
    print_info "目录来源：$dir_source"
    print_info "目标插件目录：$plugin_dir"
    echo ""
    
    # 检查目录是否存在
    if ! check_directory "$plugin_dir"; then
        local parent_dir=$(dirname "$plugin_dir")
        
        # 检查父目录是否存在
        if ! check_directory "$parent_dir"; then
            local custom_result=$(ask_custom_directory "$plugin_dir")
            if [ -n "$custom_result" ]; then
                plugin_dir="$custom_result"
                dir_source="用户指定"
            fi
        else
            # 父目录存在，直接创建
            print_warning "插件目录不存在，将自动创建"
        fi
    fi
    
    echo ""
    
    # 执行部署步骤
    check_dependencies
    echo ""
    build_project
    echo ""
    create_target_dir "$plugin_dir"
    copy_files "$plugin_dir" "$UPDATE_MODE"
    echo ""
    show_deployment_info "$plugin_dir" "$dir_source"
}

# 运行主函数
main "$@"

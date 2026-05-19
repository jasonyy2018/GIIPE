#!/usr/bin/env python3
"""
修复 docker-compose.prod.yml 并添加 volume 挂载
安全地修改 YAML 文件，避免格式错误
"""

import sys
import shutil
from pathlib import Path

def fix_docker_compose():
    file_path = Path('docker-compose.prod.yml')
    backup_path = Path('docker-compose.prod.yml.backup')
    
    # 检查文件是否存在
    if not file_path.exists():
        print("错误: docker-compose.prod.yml 不存在")
        sys.exit(1)
    
    # 创建备份
    if backup_path.exists():
        print(f"使用现有备份: {backup_path}")
        shutil.copy(backup_path, file_path)
    else:
        print("创建备份...")
        shutil.copy(file_path, backup_path)
    
    # 读取文件
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"错误: 无法读取文件: {e}")
        sys.exit(1)
    
    # 查找 frontend 服务部分
    in_frontend = False
    found_volumes = False
    found_src_mount = False
    insert_index = None
    volumes_index = None
    
    for i, line in enumerate(lines):
        # 检测 frontend 服务开始
        if line.strip().startswith('frontend:'):
            in_frontend = True
            continue
        
        # 检测 frontend 服务结束（下一个服务或顶级键）
        if in_frontend:
            stripped = line.strip()
            # 如果是新的服务（以字母开头，有冒号，且缩进为 2 个空格）
            if stripped and not line.startswith(' ') and ':' in stripped:
                break
            # 如果是顶级键（如 volumes:, networks:）
            if stripped in ['volumes:', 'networks:'] and not line.startswith('    '):
                break
            
            # 查找 SERVER_API_URL 行（这是插入 volumes 的好位置）
            if 'SERVER_API_URL:' in line:
                insert_index = i + 1
            
            # 查找是否已有 volumes 配置
            if line.strip() == 'volumes:':
                found_volumes = True
                volumes_index = i
            
            # 检查是否已挂载 src
            if './frontend/src' in line or 'frontend/src' in line:
                found_src_mount = True
    
    # 如果已挂载，无需修改
    if found_src_mount:
        print("✓ 源代码目录已挂载，无需修改")
        return True
    
    # 准备插入的内容
    volume_lines = [
        '    volumes:\n',
        '      - ./frontend/src:/app/src:ro\n'
    ]
    
    # 插入 volumes 配置
    if found_volumes and volumes_index is not None:
        # 在现有 volumes 部分添加
        print(f"在现有 volumes 配置后添加源代码挂载（第 {volumes_index + 1} 行）...")
        # 找到 volumes 部分的结束位置
        insert_pos = volumes_index + 1
        while insert_pos < len(lines) and (lines[insert_pos].startswith('      ') or lines[insert_pos].strip() == ''):
            insert_pos += 1
        lines.insert(insert_pos, volume_lines[1])
    elif insert_index is not None:
        # 在 SERVER_API_URL 后插入新的 volumes 配置
        print(f"在 SERVER_API_URL 后添加 volumes 配置（第 {insert_index + 1} 行）...")
        lines.insert(insert_index, '\n')
        lines.insert(insert_index + 1, volume_lines[0])
        lines.insert(insert_index + 2, volume_lines[1])
    else:
        print("错误: 无法找到合适的插入位置")
        return False
    
    # 写入文件
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("✓ 已成功添加 volume 配置")
        return True
    except Exception as e:
        print(f"错误: 无法写入文件: {e}")
        # 恢复备份
        if backup_path.exists():
            shutil.copy(backup_path, file_path)
            print("已恢复备份文件")
        return False

def validate_yaml():
    """验证 YAML 格式"""
    try:
        import yaml
        with open('docker-compose.prod.yml', 'r', encoding='utf-8') as f:
            yaml.safe_load(f)
        print("✓ YAML 格式验证通过")
        return True
    except ImportError:
        print("警告: PyYAML 未安装，跳过 YAML 验证")
        print("可以运行: pip install pyyaml")
        return None
    except yaml.YAMLError as e:
        print(f"错误: YAML 格式验证失败: {e}")
        return False

if __name__ == '__main__':
    print("==========================================")
    print("修复 YAML 并添加 Volume 挂载")
    print("==========================================")
    print("")
    
    if fix_docker_compose():
        print("")
        validate_yaml()
        print("")
        print("修复完成！")
        print("")
        print("下一步:")
        print("  1. 验证配置: docker-compose -f docker-compose.prod.yml config")
        print("  2. 重启容器: docker-compose -f docker-compose.prod.yml up -d frontend")
    else:
        print("")
        print("修复失败，请手动编辑 docker-compose.prod.yml")
        sys.exit(1)


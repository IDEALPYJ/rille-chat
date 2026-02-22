#!/usr/bin/env python3
"""
将HTML格式的API文档转换为Markdown格式 - 改进版
"""

from bs4 import BeautifulSoup
import re


def clean_text(text):
    """清理文本，移除多余的空白"""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def process_inline_elements(element):
    """处理内联元素（链接、代码、粗体等）"""
    result = []
    
    for child in element.children:
        if isinstance(child, str):
            text = clean_text(child)
            if text:
                result.append(text)
        elif child.name == 'a':
            link_text = clean_text(child.get_text())
            href = child.get('href', '')
            if link_text:
                result.append(f"[{link_text}]({href})")
        elif child.name == 'code':
            code_text = clean_text(child.get_text())
            if code_text:
                result.append(f"`{code_text}`")
        elif child.name == 'strong':
            strong_text = clean_text(child.get_text())
            if strong_text:
                result.append(f"**{strong_text}**")
        elif child.name == 'em':
            em_text = clean_text(child.get_text())
            if em_text:
                result.append(f"*{em_text}*")
    
    return ' '.join(result)


def process_list(ul_elem, level=0):
    """处理列表"""
    result = []
    indent = '  ' * level
    
    for li in ul_elem.find_all('li', recursive=False):
        # 处理列表项内容
        li_parts = []
        
        for child in li.children:
            if isinstance(child, str):
                text = clean_text(child)
                if text:
                    li_parts.append(text)
            elif child.name == 'ul':
                # 添加当前列表项
                if li_parts:
                    result.append(f"{indent}- {' '.join(li_parts)}")
                    li_parts = []
                # 递归处理嵌套列表
                result.extend(process_list(child, level + 1))
            elif child.name == 'a':
                link_text = clean_text(child.get_text())
                href = child.get('href', '')
                if link_text:
                    li_parts.append(f"[{link_text}]({href})")
            elif child.name == 'code':
                code_text = clean_text(child.get_text())
                if code_text:
                    li_parts.append(f"`{code_text}`")
            elif child.name == 'strong':
                strong_text = clean_text(child.get_text())
                if strong_text:
                    li_parts.append(f"**{strong_text}**")
            elif child.name in ['p', 'div']:
                # 处理段落中的内联元素
                para_text = process_inline_elements(child)
                if para_text:
                    li_parts.append(para_text)
        
        if li_parts:
            result.append(f"{indent}- {' '.join(li_parts)}")
    
    return result


def process_code_block(code_elem):
    """处理代码块"""
    code_text = code_elem.get_text()
    
    # 按行分割并清理
    lines = code_text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        # 跳过空行和纯数字行号
        if stripped and not (stripped.isdigit() and len(stripped) <= 4):
            cleaned_lines.append(line)
    
    code_text = '\n'.join(cleaned_lines)
    
    # 检测代码语言
    language = detect_code_language(code_elem, code_text)
    
    return f"```{language}\n{code_text}\n```"


def detect_code_language(code_elem, code_text):
    """检测代码语言"""
    # 首先检查 class 属性
    classes = code_elem.get('class', [])
    for cls in classes:
        if cls.startswith('language-'):
            return cls.replace('language-', '')
    
    # 通过内容推断
    code_lower = code_text.lower().strip()
    
    if code_lower.startswith('curl'):
        return 'bash'
    elif 'from openai import' in code_lower or ('import openai' in code_lower and 'client = OpenAI()' in code_text):
        return 'python'
    elif 'import OpenAI from' in code_text or 'const openai' in code_text or 'await openai' in code_text:
        return 'javascript'
    elif 'using System' in code_text or 'using OpenAI' in code_text:
        return 'csharp'
    elif code_text.strip().startswith('{') or code_text.strip().startswith('['):
        return 'json'
    
    return ''


def process_paragraph(p_elem):
    """处理段落"""
    return process_inline_elements(p_elem)


def html_to_markdown(html_content):
    """将HTML内容转换为Markdown"""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    md_lines = []
    md_lines.append("# Responses API\n")
    
    # 查找主要内容区域
    api_ref = soup.find('div', class_='api-ref')
    if not api_ref:
        api_ref = soup
    
    # 处理所有 section
    sections = api_ref.find_all('div', class_='section', recursive=False)
    
    for section in sections:
        process_section(section, md_lines)
    
    # 合并并清理
    markdown = '\n'.join(md_lines)
    markdown = re.sub(r'\n{3,}', '\n\n', markdown)
    
    return markdown


def process_section(section, md_lines):
    """处理一个 section"""
    
    # 处理标题
    heading = section.find(['h1', 'h2', 'h3', 'h4'], recursive=False)
    if heading:
        heading_level = int(heading.name[1])
        title = clean_text(heading.get_text())
        if title:
            md_lines.append(f"\n{'#' * heading_level} {title}\n")
    
    # 处理 markdown 内容区域
    markdown_content = section.find('div', class_='docs-markdown-content', recursive=False)
    if markdown_content:
        process_markdown_content(markdown_content, md_lines)
    
    # 处理 endpoint
    endpoint = section.find('div', class_='endpoint', recursive=False)
    if endpoint:
        process_endpoint(endpoint, md_lines)


def process_markdown_content(markdown_content, md_lines):
    """处理 markdown 内容区域"""
    
    # 处理段落
    for p in markdown_content.find_all('p', recursive=False):
        para_text = process_paragraph(p)
        if para_text:
            md_lines.append(f"{para_text}\n")
    
    # 处理列表
    for ul in markdown_content.find_all('ul', recursive=False):
        list_lines = process_list(ul)
        md_lines.extend(list_lines)
        md_lines.append("")


def process_endpoint(endpoint, md_lines):
    """处理 API endpoint"""
    
    # 提取端点信息
    endpoint_text = endpoint.find('span', class_='endpoint-text')
    if endpoint_text:
        method_elem = endpoint_text.find('span', class_='endpoint-method')
        path_elem = endpoint_text.find('span', class_='endpoint-path')
        
        if method_elem and path_elem:
            method = method_elem.get_text().upper()
            path = clean_text(path_elem.get_text())
            md_lines.append(f"\n**{method}** `{path}`\n")
    
    # 处理端点摘要
    summary = endpoint.find('div', class_='endpoint-summary')
    if summary:
        for p in summary.find_all('p', recursive=False):
            para_text = process_paragraph(p)
            if para_text:
                md_lines.append(f"{para_text}\n")
    
    # 处理参数部分
    param_section = endpoint.find('div', class_='param-section')
    if param_section:
        process_param_section(param_section, md_lines)
    
    # 处理代码示例
    # 查找 code-sample-body 区域
    code_sample_body = endpoint.find('div', class_='code-sample-body')
    if code_sample_body:
        # 提取所有代码块（包括 hidden 的）
        code_blocks = code_sample_body.find_all('div', class_='code-block')
        if code_blocks:
            md_lines.append("\n### Examples\n")
            for code_block in code_blocks:
                pre = code_block.find('pre')
                if pre:
                    code_elem = pre.find('code')
                    if code_elem:
                        md_lines.append(process_code_block(code_elem))
                        md_lines.append("")


def process_param_section(param_section, md_lines):
    """处理参数部分"""
    
    # 查找标题
    h4 = param_section.find('h4')
    if h4:
        md_lines.append(f"\n### {clean_text(h4.get_text())}\n")
    
    # 处理参数表格
    param_table = param_section.find('div', class_='param-table')
    if param_table:
        process_param_table(param_table, md_lines)


def process_param_table(param_table, md_lines):
    """处理参数表格"""
    
    # 处理每个参数行
    param_rows = param_table.find_all('div', class_='param-row', recursive=False)
    
    for param_row in param_rows:
        process_param_row(param_row, md_lines)


def process_param_row(param_row, md_lines):
    """处理参数行"""
    
    # 提取参数头部信息
    param_header = param_row.find('div', class_='param-row-header')
    if not param_header:
        return
    
    # 参数名
    param_name = param_header.find('div', class_='param-name')
    name = clean_text(param_name.get_text()) if param_name else ''
    
    # 参数类型
    param_type = param_header.find('div', class_='param-type')
    type_text = clean_text(param_type.get_text()) if param_type else ''
    
    # 可选/必需
    param_optl = param_header.find('div', class_='param-optl')
    optl_text = clean_text(param_optl.get_text()) if param_optl else ''
    
    if not name:
        return
    
    # 输出参数头部
    md_lines.append(f"\n#### `{name}`")
    if type_text and optl_text:
        md_lines.append(f"\n*{type_text}* - {optl_text}\n")
    elif type_text:
        md_lines.append(f"\n*{type_text}*\n")
    
    # 提取参数描述
    param_desc = param_row.find('div', class_='param-desc')
    if param_desc:
        process_param_desc(param_desc, md_lines)


def process_param_desc(param_desc, md_lines):
    """处理参数描述"""
    
    # 获取 docs-markdown-content
    markdown_content = param_desc.find('div', class_='docs-markdown-content')
    if not markdown_content:
        return
    
    # 处理段落
    for p in markdown_content.find_all('p', recursive=False):
        para_text = process_paragraph(p)
        if para_text:
            md_lines.append(f"{para_text}\n")
    
    # 处理列表
    for ul in markdown_content.find_all('ul', recursive=False):
        list_lines = process_list(ul)
        md_lines.extend(list_lines)
        md_lines.append("")
    
    # 处理代码块
    for pre in markdown_content.find_all('pre', recursive=False):
        code_elem = pre.find('code')
        if code_elem:
            md_lines.append(process_code_block(code_elem))
            md_lines.append("")


def main():
    input_file = '/root/workspace/rille-chat/docs/api/apis/responses_api/responses_api.md'
    output_file = '/root/workspace/rille-chat/docs/api/apis/responses_api/responses_api_clean.md'
    
    print(f"正在读取文件: {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    print("正在转换为 Markdown...")
    markdown_content = html_to_markdown(html_content)
    
    print(f"正在写入文件: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    print(f"转换完成！输出文件: {output_file}")
    print(f"输出文件大小: {len(markdown_content)} 字符")


if __name__ == '__main__':
    main()

# 图片提取总结

## 已完成的工作

### 1. PDF图片提取
- 从 `GIIP3-Brochure-0515.pdf` 提取了 **75张图片**
- 所有图片保存在 `frontend/images/extracted/` 目录

### 2. Speaker照片
已识别并复制了 **12张speaker照片**（全部speakers）：
- `speaker_1.jpeg` - Bronwyn H. Hall (UC Berkeley)
- `speaker_2.jpeg` - Josh Lerner (Harvard Business School)
- `speaker_3.jpeg` - Ashish Arora (Duke University)
- `speaker_4.png` - Iain M. Cockburn (Boston University)
- `speaker_5.jpeg` - Alfonso Gambardella (Bocconi University)
- `speaker_6.jpeg` - Dietmar Harhoff (Max Planck Institute)
- `speaker_7.jpeg` - Petra Moser (NYU Stern)
- `speaker_8.jpeg` - Scott Stern (MIT Sloan)
- `speaker_9.jpeg` - Rosemarie Ziedonis (University of Oregon)
- `speaker_10.jpeg` - Xielin Liu (Tsinghua University)
- `speaker_11.jpeg` - Can Huang (Zhejiang University)
- `speaker_12.jpeg` - Yilin Wu (Fudan University)

位置：`frontend/images/speakers/`

### 3. Sponsor Logos
已识别并复制了 **3个sponsor logos**：
- `fudan.png` - Fudan University (复旦大学)
- `wipo.jpeg` - WIPO (世界知识产权组织)
- `nber.jpeg` - NBER (国家经济研究局)

位置：`frontend/images/sponsors/`

### 4. 配置更新
- ✅ `frontend/data/speakers.json` - 全部12位speaker使用本地照片
- ✅ `frontend/index.html` - sponsor logos使用本地文件
- ✅ 所有照片与个人信息一一对应

## 图片来源
所有图片均从会议宣传册 `GIIP3-Brochure-0515.pdf` 中提取。

## 使用的工具
- PyMuPDF (fitz) - PDF图片提取
- Pillow (PIL) - 图片分析和处理

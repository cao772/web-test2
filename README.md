# 小小世界 · 3D Playroom

一个偏温暖、圆润、微缩玩具感的网页 3D 场景。视觉方向参考 Zheng Li 的 **Gaga** 演示风格，代码与场景为重新实现，没有复制其模型或素材。

## 已做

- Three.js 微缩儿童房 / 玩耍空间
- 程序化家具、积木、轨道火车、套圈、木琴、绘本、木马和透明果冻玩具
- 圆润角色会走向你点击的玩具，并带简单步行动作
- 柔和阴影、雾化氛围、日夜切换
- 拖动旋转 / 滚轮缩放 / 自动慢镜头
- 玩具百宝箱、暂停、镜头复位
- 桌面与移动端响应式 UI

## 本地运行

```bash
npm install
npm run dev
```

默认开发地址：`http://localhost:5177`

构建：

```bash
npm run build
npm run preview
```

## 技术

- TypeScript
- Three.js
- Vite

## 参考

视觉灵感来自 [nocoo/gaga](https://github.com/nocoo/gaga)（MIT）。本项目没有直接复用其源文件、角色模型或场景素材。

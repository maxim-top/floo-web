## 蓝莺IM web 版

蓝莺IM，是由[美信拓扑](https://www.lanyingim.com/)团队研发的新一代即时通讯云服务，SDK 设计简单集成方便，服务采用云原生技术和多云架构，私有云也可按月付费。

蓝莺IM APP 为方便体验试用蓝莺IMSDK 的 DemoApp。开发者可直接[在线试用](https://chat.lanyingim.com)，也可在官网[下载页面](https://www.lanyingim.com/downloads/)选择试用所有客户端。

DemoApp 是为了演示 IM SDK 调用而开发，也因此最好的开发方式为根据 DemoApp 找到功能，然后直接查看使用示例。

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re) [![Scc Count Badge](https://sloc.xyz/github/maxim-top/lanying-im-web/?category=total&avg-wage=1)](https://github.com/maxim-top/lanying-im-web/) [![Scc Count Badge](https://sloc.xyz/github/maxim-top/lanying-im-web/?category=code&avg-wage=1)](https://github.com/maxim-top/lanying-im-web/)

## 构建

本工程为标准 web 工程，推荐使用 yarn 来操作：

1. 构建工程
   ```
   yarn build
   ```
2. 本地运行

   配置本地 `/etc/hosts` 表，增加一行

   ```
   127.0.0.1   dev.lanyingim.com
   ```

   然后再运行

   ```
   yarn dev
   ```

3. 打包应用
   ```
   yarn pack
   ```

## 开发自己的应用

请先修改蓝莺IM AppID

打开文件 `./src/App.vue`, 将默认 AppID: welovemaxim 更改为你的应用 AppID，此 AppID 为在[蓝莺IM 后台](https://console.lanyingim.com/)创建应用后获取。

## 代码风格

代码风格选择的 ESLint + Prettier，基本规则如下：

1. 所有缩进设置为 2 ，包括 Style Sheets 中的各种 css 语言文件、html 文件、JavaScript 文件和其它类型文件。
2. HTML 文件中 script 标签和 style 标签后的首行代码不缩进。
3. 函数名和花括号的空格
   - 函数声明时，函数名后不加括号；
   - 在函数表达式中 function 后面括号前不加空格；
   - 花括号中（插值表达式/解构赋值）首尾要增加空格。

Webstorm 设置可参考[这里](https://www.wenyuanblog.com/blogs/webstorm-eslint-prettier-reformat-code.html)。

## 常见问题

1. 无法导入 flooim，提示

```
export 'flooim' was not found in '../im/floo-3.0.0'
```

参考修改 babel.config.js，增加 sourceType: 'unambiguous' 设置：

```
module.exports = {
    presets: ["@vue/app", {sourceType: 'unambiguous'}],
};
```

2. 找不到 long 模块，提示

```
module "third/long" is not defined
```

这是因为 fsevent1 的问题，在 windows 下安装会失败，导致 npm 失败，可参考[这里](https://github.com/angular/angular/issues/13935)，解决方法：

```
npm i -f
```

3. vue3适配问题

```
The requested module '/src/im/floo-3.0.0.js' does not provide an export named 'default'
```

需要通过 yarn 安装 vite-plugin-commonjs 和 vite-plugin-require-transform 两个插件。
![](https://docs.lanyingim.com/assets/vue3-import.jpg)

## 其他

了解更多信息可以阅读[在线文档](https://docs.lanyingim.com/)，或者在本仓库提问，好好玩 :)

---

**蓝莺IM 专业 SDK，私有云按月付费**

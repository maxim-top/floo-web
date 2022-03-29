# 蓝莺IM SDK web 版

蓝莺IM，是由[美信拓扑](https://www.maximtop.com/)团队研发的新一代即时通讯云服务，SDK设计简单集成方便，服务采用云原生技术和多云架构，私有云也可按月付费。

本仓库是 IMSDK 的源码仓库，如果你只是开发自己的聊天 App，建议直接使用美信拓扑 IM web 版仓库 [lanying-im-web](https://github.com/maxim-top/lanying-im-web)，也可以直接[在线试用](https://chat.maximtop.com)。

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re) [![Scc Count Badge](https://sloc.xyz/github/maxim-top/floo-web/?category=total&avg-wage=1)](https://github.com/maxim-top/floo-web/) [![Scc Count Badge](https://sloc.xyz/github/maxim-top/floo-web/?category=code&avg-wage=1)](https://github.com/maxim-top/floo-web/)

## 开发

本工程为典型 yarn web 工程，开发时使用以下命令：

1. 安装所需依赖
   ```
   yarn
   ```
2. 启动本地服务
   ```
   yarn dev
   ```
3. 打包 SDK
   ```
   yarn sdk
   ```

## 发布

如要同步更新发布到 lanying-im-web，可先 clone lanying-im-web 仓库在本地根目录，运行命令

```
yarn release
```

此命令会将打包后的 SDK 文件 floo-x.x.js 和其他 UI 代码更新到 lanying-im-web 文件夹，
然后进入 lanying-im-web 文件夹提交即可。

```
cd lanying-im-web && git commit -a
```

## 代码风格

代码风格选择的 ESLint + Prettier，基本规则如下：

1. 所有缩进设置为 2 ，包括 Style Sheets 中的各种 css 语言文件、html 文件、JavaScript 文件和其它类型文件。
2. HTML 文件中 script 标签和 style 标签后的首行代码不缩进。
3. 函数名和花括号的空格
   - 函数声明时，函数名后不加括号；
   - 在函数表达式中 function 后面括号前不加空格；
   - 花括号中（插值表达式/解构赋值）首尾要增加空格。

Webstorm 设置可参考[这里](https://www.wenyuanblog.com/blogs/webstorm-eslint-prettier-reformat-code.html)。

## 生成文档

```
yarn doc
```

## 其他

了解更多信息可以阅读[在线文档](https://docs.maximtop.com/quick-start/floo-web-quick-start.html)，或者在本仓库提问，好好玩 :)

-- --
**蓝莺IM 专业SDK，私有云按月付费**

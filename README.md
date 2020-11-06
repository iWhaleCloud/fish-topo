<p align="center">
    <img width="150" src="./packages/fish-topo/docs/images/600x600.png">
</p>


<h1 align="center">FishTopo</h1>

FishTopo 是一款轻量且强大的 Canvas(&SVG) Web应用图形绘制和图形展示的套件，底层从 [ZRender](https://github.com/ecomfe/zrender) 改进而来。


## 特性：
- 易于扩展的图形节点，支持默认节点（形状节点、BPMN节点）、自定义节点(API绘制、Path路径绘制、组合节点、图片节点)。
- 智能的连线及连线组，支持节点之间的直线、折线、曲线、连线组，自动计算两点之间线段的最佳连线。
- 强大的动画支持，提供promise式的动画接口和常用缓动函数。
- 丰富的布局算法，支持水平、垂直、树布局、力导向布局等。
- 内置的序列化反序列化支持。
- 直接支持微信小程序，不需要任何 hack。
- 直接支持 node-canvas，不需要任何 hack。


## 快速上手
### typescrypt/es6
```
import { FishTopo } from '@fish-topo/core';
let ft = FishTopo.init(document.getElementById('main'))


```


### es5
```
<script src="/dist/fishtoop.min.js"></script>


var ft = FishTopo.init(document.getElementById('main'));


```


### 微信小程序中的用法：
```
<view style="width:100%;height:500px;">
    <canvas style="width: 300px; height: 500px;" canvas-id="firstCanvas"></canvas>
</view>


    let ctx = wx.createCanvasContext('firstCanvas');
    //注意这里的初始化参数，因为微信小程序不允许操作 DOM，所以引擎不能自动获取到宽度高度，这里需要手动传进去
    let qr = FishTopo.init(ctx,{width:300,height:500,renderer:'canvas'});
```


## 文档


API 文档位于 /api 目录下，在你的浏览器中打开 /api/index.html 就可以看到很漂亮的 API 文档了，风格与 Sencha(ExtJS) 相同。

/**
 * 一直覆盖在当前地图视野的Canvas对象
 *
 * @author nikai (@胖嘟嘟的骨头, nikai@baidu.com)
 *
 * @param 
 * {
 *     map 地图实例对象
 * }
 */

function OffScreenCanvasLayer(options) {
    this.options = options || {};
    this.paneName = this.options.paneName || 'mapPane';
    this.context = this.options.context || '2d';
    this.zIndex = this.options.zIndex || 0;
    this.mixBlendMode = this.options.mixBlendMode || null;
    this.enableMassClear = this.options.enableMassClear;
    this._map = options.map;
    this._lastDrawTime = null;
    this.show();

    this.initialize(this._map);
}

var global = typeof window === 'undefined' ? {} : window;

if (global.BMap) {

    OffScreenCanvasLayer.prototype.initialize = function (map) {
        this._map = map;
        var canvas = this.canvas = document.createElement("canvas");
        canvas.style.cssText = "position:absolute;" + "left:0;" + "top:0;" + "z-index:" + this.zIndex + ";user-select:none;";
        canvas.style.mixBlendMode = this.mixBlendMode;
        this.adjustSize();
        var that = this;

        return this.canvas;
    }

    OffScreenCanvasLayer.prototype.adjustSize = function () {
        var size = this._map.getSize();
        var canvas = this.canvas;

        var devicePixelRatio = this.devicePixelRatio = global.devicePixelRatio || 1;

        canvas.width = size.width * devicePixelRatio;
        canvas.height = size.height * devicePixelRatio;
        if (this.context == '2d') {
            canvas.getContext(this.context).scale(devicePixelRatio, devicePixelRatio);
        }

        canvas.style.width = size.width + "px";
        canvas.style.height = size.height + "px";
    }

    OffScreenCanvasLayer.prototype.draw = function (time) {
        var self = this;
        self._draw(time);
    }

    OffScreenCanvasLayer.prototype._draw = function (time) {
        var map = this._map;
        var size = map.getSize();
        var center = map.getCenter();
        if (center) {
            var pixel = map.pointToOverlayPixel(center);
            this.canvas.style.left = pixel.x - size.width / 2 + 'px';
            this.canvas.style.top = pixel.y - size.height / 2 + 'px';
            this.options.update && this.options.update.call(this, time);
        }
    }

    OffScreenCanvasLayer.prototype.getContainer = function () {
        return this.canvas;
    }

    OffScreenCanvasLayer.prototype.show = function () {

    }

    OffScreenCanvasLayer.prototype.hide = function () {
        this.canvas.style.display = "none";
        //this._map.removeOverlay(this);
    }

    OffScreenCanvasLayer.prototype.setZIndex = function (zIndex) {
        this.zIndex = zIndex;
        this.canvas.style.zIndex = this.zIndex;
    }

    OffScreenCanvasLayer.prototype.getZIndex = function () {
        return this.zIndex;
    }

}

export default OffScreenCanvasLayer;

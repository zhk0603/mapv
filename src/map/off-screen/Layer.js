import BaseLayer from "../BaseLayer";
import OffScreenCanvasLayer from "./OffScreenCanvasLayer";
import clear from "../../canvas/clear";
import TWEEN from "../../utils/Tween";
import DataSet from "../../data/DataSet";


class Layer extends BaseLayer {
    constructor(map, dataSet, options) {
        super(map, dataSet, options);

        var self = this;

        self.init(options);
        self.transferToMercator();

        this.canvasLayer = new OffScreenCanvasLayer({
            map: map,
            context: this.context,
            paneName: options.paneName,
            mixBlendMode: options.mixBlendMode,
            enableMassClear: options.enableMassClear,
            zIndex: options.zIndex,
            update: function (time) {
                self._canvasUpdate(time);
            }
        });
    }

    init(options) {
        var self = this;
        self.options = options;
        // this.initDataRange(options);
        this.context = self.options.context || '2d';
    }

    // 将离屏canvas追加到 主canvas上
    draw(layer, time) {
        this.canvasLayer.draw(time);
        let innerContainer = this.canvasLayer.getContainer();
        let context = layer.getContext();
        context.drawImage(innerContainer, 0, 0)
    }

    getContext() {
        return this.canvasLayer.canvas.getContext(this.context);
    }

    // 经纬度左边转换为墨卡托坐标
    transferToMercator(dataSet) {
        if (!dataSet) {
            dataSet = this.dataSet;
        }
        var projection = this.map.getMapType().getProjection();

        if (this.options.coordType !== 'bd09mc') {
            var data = dataSet.get();
            data = dataSet.transferCoordinate(data, function (coordinates) {
                if (coordinates[0] < -180 || coordinates[0] > 180 || coordinates[1] < -90 || coordinates[1] > 90) {
                    return coordinates;
                } else {
                    var pixel = projection.lngLatToPoint({
                        lng: coordinates[0],
                        lat: coordinates[1]
                    });
                    return [pixel.x, pixel.y];
                }
            }, 'coordinates', 'coordinates_mercator');
            dataSet._set(data);
        }
    }

    _canvasUpdate(time) {

        if (!this.canvasLayer) {
            return;
        }

        var self = this;

        var animationOptions = self.options.animation;

        var map = this.canvasLayer._map;

        var zoomUnit = Math.pow(2, 18 - map.getZoom());
        var projection = map.getMapType().getProjection();

        var mcCenter = projection.lngLatToPoint(map.getCenter());
        var nwMc = new BMap.Pixel(mcCenter.x - (map.getSize().width / 2) * zoomUnit, mcCenter.y + (map.getSize().height / 2) * zoomUnit); //左上角墨卡托坐标

        var context = this.getContext();

        if (self.isEnabledTime()) {
            clear(context);
            if (time === undefined) {
                clear(context);
                return;
            }
            if (this.context == '2d') {
                context.save();
                context.globalCompositeOperation = 'destination-out';
                context.fillStyle = 'rgba(0, 0, 0, .1)';
                context.fillRect(0, 0, context.canvas.width, context.canvas.height);
                context.restore();
            }
        } else {
            clear(context);
        }

        if (this.context == '2d') {
            for (var key in self.options) {
                context[key] = self.options[key];
            }
        } else {
            context.clear(context.COLOR_BUFFER_BIT);
        }

        if (self.options.minZoom && map.getZoom() < self.options.minZoom || self.options.maxZoom && map.getZoom() > self.options.maxZoom) {
            return;
        }

        var scale = 1;
        if (this.context != '2d') {
            scale = this.canvasLayer.devicePixelRatio;
        }

        var dataGetOptions = {
            fromColumn: self.options.coordType == 'bd09mc' ? 'coordinates' : 'coordinates_mercator',
            transferCoordinate: function (coordinate) {
                var x = (coordinate[0] - nwMc.x) / zoomUnit * scale;
                var y = (nwMc.y - coordinate[1]) / zoomUnit * scale;
                return [x, y];
            }
        }

        if (time !== undefined) {
            dataGetOptions.filter = function (item) {
                var trails = animationOptions.trails || 10;
                if (time && item.time > (time - trails) && item.time < time) {
                    return true;
                } else {
                    return false;
                }
            }
        }

        // get data from data set
        var data;

        if (self.options.draw === 'cluster') {
            var bounds = this.map.getBounds();
            var ne = bounds.getNorthEast();
            var sw = bounds.getSouthWest();
            var clusterData = this.supercluster.getClusters([sw.lng, sw.lat, ne.lng, ne.lat], this.getZoom());
            this.clusterDataSet.set(clusterData);
            this.transferToMercator(this.clusterDataSet);
            data = this.clusterDataSet.get(dataGetOptions);
        } else {
            data = self.dataSet.get(dataGetOptions);
        }

        this.processData(data);

        var nwPixel = map.pointToPixel(new BMap.Point(0, 0));

        if (self.options.unit == 'm') {
            if (self.options.size) {
                self.options._size = self.options.size / zoomUnit;
            }
            if (self.options.width) {
                self.options._width = self.options.width / zoomUnit;
            }
            if (self.options.height) {
                self.options._height = self.options.height / zoomUnit;
            }
        } else {
            self.options._size = self.options.size;
            self.options._height = self.options.height;
            self.options._width = self.options.width;
        }

        this.drawContext(context, data, self.options, nwPixel);
        self.options.updateCallback && self.options.updateCallback(time);
    }
}

export default Layer;

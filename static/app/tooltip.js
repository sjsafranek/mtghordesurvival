
// https://gist.github.com/biovisualize/1016860
var ToolTip = function(elem) {
    elem = elem || 'body';
    this.parent = d3.select(elem);
    this.hideTimeout;
    this.el = this.parent
        .append("div")
            .classed('tooltip', true)
            .style("position", "absolute")
            .style('width',   'auto')
            .style('height',  'auto')
            .style('padding', '5px')
            .style('z-index', '3000')
            .style("opacity", 0)
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style("color", "#fff")
            .style("font-size", "11px")
            .style("border-radius", "2px")
            .style('pointer-events', 'none')
            .text("a simple tooltip");
}

ToolTip.prototype.setStyle = function(options){
    for (var i in options) {
        this.el.style(i, options[i]);
    }
}

ToolTip.prototype.getElem = function() {
    return this.el;
}

ToolTip.prototype.height = function() {
    return this.el.node().getBoundingClientRect().height;
}

ToolTip.prototype.width = function() {
    return this.el.node().getBoundingClientRect().width;
}

ToolTip.prototype.show = function(ms) {
    ms = ms || 100;
    this.el.transition()
        .duration(ms)
        .style("opacity", 1);
}

ToolTip.prototype.showFor = function(show_ms, hide_ms, onHide) {
    var self = this;
    this.show(show_ms);
    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(function(){
        self.hide();
    }, hide_ms);

    if (onHide) {
        this.onHide = onHide;
    }
}

ToolTip.prototype.hide = function(ms) {
    ms = ms || 100;
    clearTimeout(this.hideTimeout);
    this.el.transition()
        .duration(ms)
        .style("opacity", 0);

    this.onHide && this.onHide();
}

ToolTip.prototype.moveTo = function(x,y) {
    this.el
        .style("left",x+"px")
        .style("top", y+"px");
}

ToolTip.prototype.setContent = function(content) {
    this.el.html(content);
}

ToolTip.prototype.destroy = function() {
    this.el.remove();
}

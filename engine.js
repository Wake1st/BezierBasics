var canvas = document.getElementById('DemoCanvas');
var ctx = canvas.getContext("2d");

var segments = [];

var drawingSegment;
var drawingNodes = [];
var drawing = false;
var closing = false;


class Shape {
    constructor(name) {
        this.name = name;
        this.startX = 0;
        this.startY = 0;
        this.isDragging = false;
    }
    
    transformDown(x,y) {
        this.startX = x;
        this.startY = y;
        
        if (isHit(this, x, y)) {
            this.isDragging = true;
        }
    }

    transformUp = () => this.isDragging = false;

    transformMove(x,y) {
        var dx = x - this.startX;
        var dy = y - this.startY;
        this.startX = x;
        this.startY = y;

        if (this.isDragging) {
            this.x += dx;
            this.y += dy;
        }

        return [dx, dy];
    }
}

class Rectangle extends Shape {
    constructor(name, x0, y0, x1, y1, width, height) {
        super(name);

        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this.width = width;
        this.height = height;
    }
        
    render(ctx) {
      ctx.save();
  
      ctx.beginPath();
      ctx.moveTo(this.x0,this.y0);
      ctx.lineTo(this.x1,this.y1);
      ctx.lineWidth = this.width;
      ctx.strokeStyle = 'rgba(250,250,255,0.1)';
      ctx.stroke();
      
      ctx.fillStyle = '#9ce62a';
      ctx.font = "10px Arial";
      ctx.fillText(this.name,(this.x0 + this.x1)/2-5,(this.y0 + this.y1)/2+3);
      
      ctx.restore();
    }
}

class Arc extends Shape {
    constructor(name, node, radius, radians) {
        super(name);

        this.x = node.x;
        this.y = node.y;
        this.radius = radius;
        this.radians = radians;
    }
    
    render(ctx) {
        ctx.save();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, this.radians, false);
        ctx.fillStyle = '#2793ef';
        ctx.fill();

        ctx.fillStyle = '#9ce62a';
        ctx.font = "10px Arial";
        ctx.fillText(this.name,this.x-5,this.y+3);

        ctx.restore();
    }
}

class BezierSegment {
    constructor(name, nodes, width) {
        this.name = name;
        this.nodes = [];
        this.width = width;

        //  Create nodes
        nodes.forEach(node => this.addNode(node));

        //this.line = new Rectangle(name + '_L',x0,y0,x1,y1,width,0);
        // this.headNode = new Arc(name + '_N0', node, width, Math.PI * 2);
        // this.tailNode = new Arc(name + '_N1', node, width, Math.PI * 2);
    }

    addNode(node) {
        this.nodes.push(new Arc(
            this.name + '_N' + this.nodes.length, 
            node, 
            this.width, 
            Math.PI * 2
        ));
    }

    render(ctx) {
        this.nodes.forEach(node => node.render(ctx));

        // this.line.render(ctx);
        // this.headNode.render(ctx);
        // this.tailNode.render(ctx);
    }

    transform = function(evtType, x, y) {
        switch(evtType) {
            case 'down':
                //this.line.transformDown(x,y);
                // this.headNode.transformDown(x,y);
                // this.tailNode.transformDown(x,y);
                
                this.nodes.forEach(node => node.transformDown(x,y));
                break;

            case 'up':
                //this.line.transformUp();
                // this.headNode.transformUp();
                // this.tailNode.transformUp();

                this.nodes.forEach(node => node.transformUp());
                break;
                
            case 'move':
                this.nodes.forEach(node => node.transformMove(x,y));
                break;

                // var [headDx, headDy] = this.tailNode.transformMove(x,y);
                // var [tailDx, tailDy] = this.headNode.transformMove(x,y);

                // console.log(lineDx, lineDy);
                // console.log(headDx, headDy);
                // console.log(lineDx, lineDy);
                
                // if (this.headNode.isDragging) {
                //     this.line.x0 += headDx;
                //     this.line.y0 += headDy;
                //     break;
                // }
                
                // if (this.tailNode.isDragging) {
                //     this.line.x1 += tailDx;
                //     this.line.y1 += tailDy;
                //     break;
                // }
        }
    }
}

var MouseTouchTracker = function(canvas, callback) {
    function processEvent(evt) {
        var rect = canvas.getBoundingClientRect();
        var offsetTop = rect.top;
        var offsetLeft = rect.left;

        if (evt.touches) {
            return {
                x: evt.touches[0].clientX - offsetLeft,
                y: evt.touches[0].clientY - offsetTop
            }
        } else {
            return {
                x: evt.clientX - offsetLeft,
                y: evt.clientY - offsetTop
            }
        }
    }

    function onDown(evt) {
        evt.preventDefault();
        var coords = processEvent(evt);
        callback('down', coords.x, coords.y);
    }

    function onUp(evt) {
        evt.preventDefault();
        callback('up');
    }

    function onMove(evt) {
        evt.preventDefault();
        var coords = processEvent(evt);
        callback('move', coords.x, coords.y);
    }

    canvas.ontouchmove = onMove;
    canvas.onmousemove = onMove;

    canvas.ontouchstart = onDown;
    canvas.onmousedown = onDown;
    canvas.ontouchend = onUp;
    canvas.onmouseup = onUp;
}

function sqr(x) { return x * x }

function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }

function distToSegmentSquared(p, v, w) {
    var l2 = dist2(v, w);
    if (l2 == 0) return dist2(p, v);
    var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    return dist2(p, { 
        x: v.x + t * (w.x - v.x),
        y: v.y + t * (w.y - v.y) 
    });
}

function distToSegment(p, v, w) { 
    return Math.sqrt(distToSegmentSquared(p, v, w)); 
}


function isHit(shape, x, y) {
    if (shape.constructor.name === 'Arc') {
        var dx = shape.x - x;
        var dy = shape.y - y;

        return dx * dx + dy * dy < shape.radius * shape.radius;
    } else {
        var p = { x: x, y: y };
        var v = { x: shape.x0, y: shape.y0 };
        var w = { x: shape.x1, y: shape.y1 };

        return shape.width > distToSegment(p,v,w);
    }
}



function linearBezier(t, [n0, n1]) {
    var c0 = 1 - t;
    var c1 = t;

    return {
        x: n0.x*c0 + n1.x*c1,
        y: n0.y*c0 + n1.y*c1
    }; 
}

function quadraticBezier(t, [n0, n1, n2]) {
    var c0 = t*t - 2*t + 1;
    var c1 = 2*t - 2*t*t;
    var c2 = t*t;

    return {
        x: n0.x*c0 + n1.x*c1 + n2.x*c2,
        y: n0.y*c0 + n1.y*c1 + n2.y*c2
    }; 
}

function cubicBezier(t, [n0, n1, n2, n3]) {
    var c0 = 1 - t*t*t + 3*t*t - 3*t;
    var c1 = 3*t*t*t - 6*t*t + 3*t;
    var c2 = 3*t*t - 3*t*t*t;
    var c3 = t*t*t;

    return {
        x: n0.x*c0 + n1.x*c1 + n2.x*c2 + n3.x*c3,
        y: n0.y*c0 + n1.y*c1 + n2.y*c2 + n3.y*c3
    }; 
}

function drawPoints(points) {
    //  Reset the current path
    ctx.moveTo(points[0].x, points[0].y);
    
    //  Plot points
    ctx.beginPath();
    for (var i=1; i<points.length; i++)
        ctx.lineTo(points[i].x,points[i].y);
    
    //  Make the line visible
    ctx.stroke();
}

function drawLine(nodes) {
    points = [];
    var pointCount = 30;

    for (var i=0; i < pointCount; i++) {
        if (nodes.length === 1)
            points.push(nodes[0]);
        else if (nodes.length === 2)
            points.push(linearBezier(i/pointCount,nodes));
        else if (nodes.length === 3)
            points.push(quadraticBezier(i/pointCount,nodes));
        else
            points.push(cubicBezier(i/pointCount,nodes));
    }

    ctx.strokeStyle = '#e2e2ee';    
    drawPoints(points);
}



// var N0 = { x: 100, y: 200 };
// var N1 = { x: 120, y: 100 };
// var N2 = { x: 280, y: 100 };
// var N3 = { x: 300, y: 200 };


// var C0 = new Arc('P0',N0.x, N0.y, 10, Math.PI * 2);
// var C1 = new Arc('P1',N1.x, N1.y, 10, Math.PI * 2);
// var C2 = new Arc('P2',N2.x, N2.y, 10, Math.PI * 2);
// var C3 = new Arc('P3',N3.x, N3.y, 10, Math.PI * 2);


var mtt = new MouseTouchTracker(canvas,
    function(evtType, x, y) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (drawing && evtType === 'down') {
            if (drawingSegment) {
                switch (drawingSegment.nodes.length) {
                    case 3:
                        drawingSegment.addNode({x,y});
                        segments.push(drawingSegment);
                        drawingSegment = null;
            
                        closing = false;
                        break;
                    default:
                        drawingSegment.addNode({x,y});
                        break;
                }
            } else {
                drawingSegment = new BezierSegment(
                    'Z_' + segments.length, 
                    [{ x, y }], 
                    8
                );
            }
        }
        else if (closing) {
            if (drawingSegment)
                segments.push(drawingSegment);
            drawingSegment = null;

            drawing = false;
            closing = false;
        }

        segments.forEach(z => {
            z.transform(evtType,x,y);
            z.render(ctx);
            drawLine(z.nodes);
        });

        if (drawingSegment) {
            drawingSegment.transform(evtType,x,y);
            drawingSegment.render(ctx);
            drawLine(drawingSegment.nodes);
        }
    }
);


function resizeScreen() {
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
}

window.onload = (event) => {
    resizeScreen();
    // drawLine();
    // segments.forEach(z => z.render(ctx));
};

document.addEventListener("keypress", function (e) {
    if (e.key === 'd') {
        drawing = !drawing;
        closing = !drawing;
    }
});
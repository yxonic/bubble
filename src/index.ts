import * as d3 from 'd3';
import './style.scss'

var state = {
    "nodes": [
        {"id": "node1", "desc": "this is node1", "type": 0, "selected": true},
        {"id": "node2", "desc": "this is node2", "type": 1, "selected": false}
    ],
    "links": [
        {"source": "node1", "target": "node2", "width": 5, "curved": false}
    ]
};

var selectedNode = state.nodes[0];
var nodeMap = {"node1": state.nodes[0]}
var linkList = {"node1": [state.links[0]], "node2": []};

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");
var link = svg.append("g").attr("class", "links").selectAll("line");
var node = svg.append("g").attr("class", "nodes").selectAll("circle");

svg.append("defs").append("marker")
    .attr("id", "straight")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 0)
    .attr("refY", 0)
    .attr("markerWidth", 4)
    .attr("markerHeight", 4)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-4L8,0L0,4");

svg.append("defs").append("marker")
    .attr("id", "curved")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 0)
    .attr("refY", 0)
    .attr("markerWidth", 4)
    .attr("markerHeight", 4)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-4L8,0L0,4");

var zoom = d3.zoom()
    .scaleExtent([1/8, 2])
    .on("zoom", zoomed);

d3.select("button")
    .on("click", resetted);

svg.call(zoom);

var current_transform = "";

function zoomed() {
    current_transform = d3.event.transform;
    node.attr("transform", current_transform);
    link.attr("transform", current_transform);
}

function resetted() {
  svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);
}

var color = d3.scaleOrdinal(d3.schemeCategory10);

var simulation = d3.forceSimulation()
    .force("charge", d3.forceManyBody().strength(-250))
    .force("link", d3.forceLink().distance(100).id(function(d) { 
        return d.id;
    }))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .velocityDecay(0.2)
    .on("tick", ticked);

simulation.nodes(state.nodes).on("tick", ticked());
simulation.force("link").links(state.links);

function updateStates() {
    node = node.data(state.nodes, function(d) { return d.id; });
    node.exit().remove();
    node = node.enter().append("circle")
        .attr("transform", current_transform)
        .merge(node)
        .attr("class", function(d) { return d.selected ? "selected" : ""; })
        .attr("fill", function(d) { return color(d.type); })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("click", function(e) {
            let newNode = "node" + (state.nodes.length + 1);
            addNode(newNode, "new one", state.nodes.length, e.x, e.y);
            addLink(newNode, e.id, 5);
            if (state.nodes.length % 3 == 0)
                addLink(e.id, newNode, 5);
            updateStates();
        });

    link = link.data(state.links, function(d) { return d.source + d.target; });
    link.exit().remove();
    link = link.enter().append("path")
        .attr("transform", current_transform)
        .merge(link)
        .attr("marker-end", "url(#straight)")
        .attr("stroke-width", function(d) { return d.width; });

    simulation.nodes(state.nodes);
    simulation.force("link").links(state.links);
    simulation.alpha(0.5).restart();
}

function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

function ticked() {
    return function() {
        link.attr("d", getPath);

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    };
}

function getPath(d) {
    var r = 30;
    if (d.target.selected)
        r = 40;
    var dx = d.target.x - d.source.x,
        dy = d.target.y - d.source.y,
        dr = Math.sqrt(dx * dx + dy * dy),
        pathLength = Math.sqrt((dx * dx) + (dy * dy)),
        offsetX = (dx * r) / pathLength,
        offsetY = (dy * r) / pathLength;
    if (d.curved) {
        var sinx = r / 2 / dr, cosx = Math.sqrt(1 - sinx*sinx);
        var diffX = dx * cosx + dy * sinx,
            diffY = dy * cosx - dx * sinx;
        var tx = d.source.x + diffX - offsetX,
            ty = d.source.y + diffY - offsetY;
        return "M" + d.source.x + "," + d.source.y + 
            "A" + dr + "," + dr + " 0 0,1 " + tx + "," + ty;
    }
    else {
        return "M" + d.source.x + "," + d.source.y + "L" + 
            (d.target.x - offsetX) + "," + (d.target.y - offsetY);
    }
}

function addNode(id, desc, type, x, y) {
    var node = {"id": id, "desc": desc, "type": type, "selected": true};
    if (x && y) {
        node.x = x; node.y = y;
    }
    else {
        node.x = width / 2;
        node.y = height / 2;
    }
    selectedNode.selected = false;
    selectedNode = node;
    state.nodes.push(node);
    nodeMap[id] = node;
}

function addLink(source, target, width) {
    let sNode = nodeMap[source];
    let tNode = nodeMap[target];
    let ind = -1;
    let targetList = linkList[target];
    if (targetList) {
        for (let i = 0; i < targetList.length; i++) {
            let e = targetList[i];
            if (e.target == source)
                ind = i;
        }
    }
    let link = {"source": source,
                "target": target,
                "width": width, 
                "curved": ind != -1 ? true : false};
    state.links.push(link);
    if (!linkList[source])
        linkList[source] = [];
    linkList[source].push(link);
    if (ind != -1)
        linkList[target][ind].curved = true;
}

updateStates();

/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Component, Input } from '@angular/core';
import * as d3 from 'd3';

@Component({
    selector: 'app-object-network',
    template: `
        <p><em>When number of sensor things objects on the right column is stable, click button to show
        a graph of objects.<br/><br/>
        Objects are displayed in the same order they have been discovered.<br/>
        Hover over a circle to get details. Click on a circle to pin the object on the right.<br/><br/>
        Clikc on the name of a sensor things object on the right to show its incoming observations.</em></p>
        <button (click)="onDrawClick()" class="btn btn-primary">Show network of sensor things objects</button><br/>
    <svg class="graph-container" width="960" height="500"></svg>
  `,
})
/**
 * Display a tree of objects using d3js
 * Initially based on https://github.com/RazumO/MultipleParentsTree 
 * (even though everything has been adapted/rewritten)
 */
export class ObjectNetworkComponent {

    @Input() // chartdata from the sensor component
    private chartData;
    private _linksData;
    private _svg;
    private _renderOptions = {
        svgWidth: 960,
        svgHeight: 500,
        svgMargin: { top: 20, right: 120, bottom: 20, left: 120 },
        classes: {
            classToHideElement: "hidden",
            linkClass: "link",
            nodeClass: "node"
        },
        spaceBetweenDepthLevels: Math.floor(960 / 6), // svgWidth / 6
        topDirectedLinkPathCoord: 0,
        bottomDirectedLinkPathCoord: 500,
        markerCssStyles: {
            viewBox: '0 -5 10 10',
            refX: 18,
            refY: 0,
            markerWidth: 6,
            markerHeight: 6,
            orient: 'auto'
        },
        circleCssStyles: {
            r: 10,
            fill: '#fff',
            fillOpacity: 1,
            text: {
                dy: '-1em',
                dx: { left: '13px', right: '-13px;' }
            }
        },
        circleOutlineCssStyles: {
            r: 10,
            fill: '#fff',
            fillOpacity: 1,
            text: {
                dy: '-1em',
                dx: { left: '13px', right: '-13px;' }
            }
        }
    };

    /** When the "draw network" button is pushed */
    onDrawClick() {
        d3.selectAll("g").remove();
        this._linksData = Array.from(this.chartData.values());
        console.log(JSON.stringify(this._linksData));
        this._renderTree(this._generateTree(this._linksData));
    }

    /** Create a tree from chartdata */
    private _generateTree(realData) {
        const data = JSON.parse(JSON.stringify(realData));
        const dataMap = this._reduceArray(data);
        const treeData = [];

        // Adding data-target attribute with id's of targets of every node
        data.forEach((node, index) => {
            node.index = index;
            if (node.parents_id) {
                const parentLength = node.parents_id.length;
                node.parents_id.forEach((parentItem, i) => {
                    const parent = dataMap[parentItem.id];
                    if (parent !== undefined) {
                        if (parentLength > 1) {
                            if (i !== parentLength - 1) {
                                if (!parent.data_targets_id) {
                                    parent.data_targets_id = [{ id: node.product_id, type: parentItem.type }];
                                } else {
                                    parent.data_targets_id.push({ id: node.product_id, type: parentItem.type });
                                }
                                return;
                            }
                        }
                        parent.children = parent.children || [];
                        node.type = parentItem.type;
                        parent.children.push(node);
                    }
                });
            } else {
                treeData.push(node);
            }
        });
        return treeData[0];
    }

    /** Render the tree */
    private _renderTree(root) {
        const margin = this._renderOptions.svgMargin;
        const width = this._renderOptions.svgWidth - margin.right - margin.left;
        const height = this._renderOptions.svgHeight - margin.top - margin.bottom;
        let nodes, nodeGroup, links, nodesMap, isBackRelations;

        const tree = d3.cluster().size([height, width]);
        this._svg = d3.select(".graph-container").append("svg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Compute the tree layout.
        const layout = d3.hierarchy(root);
        tree(layout);
        nodes = layout.descendants().reverse();
        links = layout.links();
        nodesMap = this._reduceArray(nodes);
        // Normalize for fixed-depth.
        isBackRelations = false;
        nodes.forEach((d) => {
            d.y = d.depth * this._renderOptions.spaceBetweenDepthLevels;
        });

        this._addFixedDepth(nodes, nodesMap, isBackRelations);
        nodeGroup = this._drawNodes(nodes);
        nodeGroup.append("circle")
            .attr("r", this._renderOptions.circleCssStyles.r)
            .style("fill", (d) => this._renderOptions.circleCssStyles.fill);
        nodeGroup.append("text")
            .attr("x", (d) => {
                return d.children || d._children ? undefined : undefined;
            })
            .attr("dy", this._renderOptions.circleCssStyles.text.dy)
            .attr("text-anchor", (d) => {
                return d.children || d._children ? "end" : "start";
            })
            .text((d) => d.data.name)
            .style("fill-opacity", this._renderOptions.circleCssStyles.fillOpacity);
        this._drawLinks(links, nodes);
    }

    /** Draw nodes and add action listener (mouseover, click, mouseout) on them */
    private _drawNodes(nodes) {
        let i = 0;
        const node = this._svg.selectAll("g.node")
            .data(nodes, (d) => {
                if (!d.id) {
                    i += 1;
                    d.id = i;
                }
                return d.id;
            });

        return node.enter().append("g")
            .attr("class", (d) => {
                let nodeClasses = this._renderOptions.classes.nodeClass;
                if (d.data.hidden) {
                    nodeClasses += ' ' + this._renderOptions.classes.classToHideElement;
                }
                return nodeClasses;
            })
            .attr("data-index", (d) => d.index)
            .attr("data-parent-index", (d) => {
                return (d.parent ? d.parent.index : undefined);
            })
            .attr("data-type", (d) => d.type)
            .attr("transform", (d) => "translate(" + d.y + "," + d.x + ")")
            .on("click", function (d) { // click on the element. If pinned ? unpin : pin. 
                // keep function declaration to use context in select
                const element = document.getElementById(d.data.product_id);
                if (element === null) {
                    return;
                }
                if (element.classList.contains("pinned")) {
                    element.classList.remove("pinned");
                    d3.select(this).style("fill", () => "#000000");
                } else {
                    element.classList.add("pinned");
                    d3.select(this).style("fill", () => "#000FFF");
                }
            })
            .on("mouseover", (d) => { // display detailled description in the right column
                const element = document.getElementById(d.data.product_id);
                if (element !== null) {
                    element.classList.remove("hidden");
                }
            })
            .on("mouseout", (d) => { // hide detailled description unless pinned
                const element = document.getElementById(d.data.product_id);
                if (element !== null && !element.classList.contains("pinned")) {
                    element.classList.add("hidden");
                }
            });
    }

    /** Draw links between every nodes (except those hidden) */
    private _drawLinks(links, nodes) {
        const link = this._svg.selectAll("path.link")
            .data(links, (d) => d.target.id);
        link.enter().insert("path", "g")
            .attr("class", (d) => {
                let linkClasses = this._renderOptions.classes.linkClass + " " + d.target.type;
                if (d.target.data.hidden) {
                    linkClasses += " " + this._renderOptions.classes.classToHideElement;
                }
                return linkClasses;
            })
            .attr("d", (d) => this._diagonal(d));
    }

    /** 
     * Tree modification functions
     */

    /** Set position of nodes */
    private _addFixedDepth(nodes, nodesMap, isBackRelations) {
        nodes.forEach((d) => {
            if (d.data_targets_id) {
                const targets = d.data_targets_id;
                targets.forEach((currentTarget) => {
                    const target = nodesMap[currentTarget.id];
                    const source = d;
                    if (source.y >= target.y) {
                        isBackRelations = true;
                        this._replaceNodeAndChildren(target, target, source.depth + 1);
                        target.depth = source.depth + 1;
                    }
                });
            }
        });
        if (isBackRelations) {
            isBackRelations = false;
            this._addFixedDepth(nodes, nodesMap, isBackRelations);
        }
    }

    /** recursively change distance in a node and its children */
    private _replaceNodeAndChildren(node, root, distance) {
        if (node.children) {
            node.children.forEach((child) => {
                this._replaceNodeAndChildren(child, root, distance);
            });
        }
        node.y = (distance + (node.depth - root.depth)) * this._renderOptions.spaceBetweenDepthLevels;
        node.depth = (distance + (node.depth - root.depth));
    }

    /** 
     * low level data manipulation functions 
     */

    /** Transform an array of object to a map of object indexed by their id. */
    private _reduceArray(arr) {
        return arr.reduce((map, item) => {
            map[item.product_id] = item;
            return map;
        }, {});
    }

    /** Transform an array of Node to a map indexed by node id */
    private _reduceArrayNode(arr) {
        return arr.reduce((map, item) => {
            map[item.data.product_id] = item;
            return map;
        }, {});
    }

    /** Return path between a source and a target */
    private _diagonal = (d) => {
        return "M" + d.source.y + "," + d.source.x
            + "C" + (d.source.y + d.target.y) / 2 + "," + d.source.x
            + " " + (d.source.y + d.target.y) / 2 + "," + d.target.x
            + " " + d.target.y + "," + d.target.x;
    }

    /** Add links for nodes having more than one parent. */
    private _addSpecialParent(position, link, maxTargetsCount, nodesMap) {
        link.enter().insert("path", "g")
            .attr("d", (d) => {
                if (d.source.data.data_targets_id) {
                    const targets = d.source.data.data_targets_id;
                    const length = targets.length;
                    if (length > maxTargetsCount) {
                        maxTargetsCount = length;
                    }
                    if (position < length) {
                        d.target = nodesMap[targets[position].id];
                    } else {
                        return;
                    }
                    return this._diagonal(d);
                }
            })
            .attr("class", (d) => {
                if (d.source.data.data_targets_id) {
                    const targets = d.source.data.data_targets_id;
                    if (position < targets.length) {
                        return this._renderOptions.classes.linkClass + ' ' + targets[position].type;
                    }
                }
            });
    }


}

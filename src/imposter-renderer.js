"use strict";

var glm = require('./gl-matrix');
var core = require('./webgl.js');
var fs = require('fs');
var cube = require("./cube");
var elements = require("./elements");
var View = require("./view");

module.exports = function (canvas, resolution) {

        var self = this;

        var range,
            samples,
            atoms;

        var gl, 
            canvas;

        var rScene = null,
            rBonds = null,
            rDispQuad = null,
            rAccumulator = null,
            rAO = null,
            rFXAA = null;

        var tSceneColor,
            tSceneNormal,
            tSceneDepth,
            tRandRotDepth,
            tRandRotNormal,
            tRandRotColor,
            tAccumulator,
            tAccumulatorOut,
            tAO;

        var tiSceneColor,
            tiSceneNormal,
            tiSceneDepth,
            tiRandRotDepth,
            tiRandRotNormal,
            tiRandRotColor,
            tiAccumulator,
            tiAccumulatorOut,
            tiAO;

        var fbScene,
            fbRandRot,
            fbAccumulator,
            fbAO;

        var progScene,
            progBonds,
            progAccumulator,
            progAO,
            progFXAA,
            progDisplayQuad;

        var extFragDepth,
            extDrawBuffers,
            extDepthTexture;

        var sampleCount = 0,
            initialRender = false;

        self.initialize = function() {

            // Initialize canvas/gl.
            canvas.width = canvas.height = resolution;
            gl = canvas.getContext('webgl');
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE);
            gl.clearColor(0,0,0,0);
            gl.clearDepth(1);
            gl.viewport(0,0,resolution,resolution);

            window.gl = gl;

            extFragDepth = gl.getExtension("EXT_frag_depth");
            extDepthTexture = gl.getExtension("WEBGL_depth_texture");
            extDrawBuffers = gl.getExtension("WEBGL_draw_buffers");

            // Define texture locations.
            tiSceneColor     = 0;
            tiSceneDepth     = 1;
            tiSceneNormal    = 2;
            tiRandRotColor   = 3;
            tiRandRotDepth   = 4;
            tiRandRotNormal  = 5;
            tiAccumulator    = 6;
            tiAccumulatorOut = 7;
            tiAO             = 8;

            self.createTextures();

            // Initialize shaders.
            progScene = loadProgram(gl, fs.readFileSync(__dirname + "/shaders/scene.glsl", 'utf8'));
            progBonds = loadProgram(gl, fs.readFileSync(__dirname + "/shaders/bonds.glsl", 'utf8'));
            progDisplayQuad = loadProgram(gl, fs.readFileSync(__dirname + "/shaders/textured-quad.glsl", 'utf8'));
            progAccumulator = loadProgram(gl, fs.readFileSync(__dirname + "/shaders/accumulator.glsl", 'utf8'));
            progAO = loadProgram(gl, fs.readFileSync(__dirname + "/shaders/ao.glsl", 'utf8'));
            progFXAA = loadProgram(gl, fs.readFileSync(__dirname + "/shaders/fxaa.glsl", 'utf8'));

            var position = [
                -1, -1, 0,
                 1, -1, 0,
                 1,  1, 0,
                -1, -1, 0,
                 1,  1, 0,
                -1,  1, 0
            ];

            // Initialize geometry.
            var attribs = {
                aPosition: {
                    buffer: new core.Buffer(gl),
                    size: 3
                },
            };
            attribs.aPosition.buffer.set(new Float32Array(position));
            var count = position.length / 9;
            rDispQuad = new core.Renderable(gl, progDisplayQuad, attribs, count);

            // Initialize geometry.
            var attribs = {
                aPosition: {
                    buffer: new core.Buffer(gl),
                    size: 3
                },
            };
            attribs.aPosition.buffer.set(new Float32Array(position));
            var count = position.length / 9;
            rAccumulator = new core.Renderable(gl, progAccumulator, attribs, count);

            // Initialize geometry.
            var attribs = {
                aPosition: {
                    buffer: new core.Buffer(gl),
                    size: 3
                },
            };
            attribs.aPosition.buffer.set(new Float32Array(position));
            var count = position.length / 9;
            rAO = new core.Renderable(gl, progAO, attribs, count);

            // Initialize geometry.
            var attribs = {
                aPosition: {
                    buffer: new core.Buffer(gl),
                    size: 3
                },
            };
            attribs.aPosition.buffer.set(new Float32Array(position));
            var count = position.length / 9;
            rFXAA = new core.Renderable(gl, progFXAA, attribs, count);

            samples = 0;

        }

        self.createTextures = function() {
            // fbRandRot
            gl.activeTexture(gl.TEXTURE0 + tiRandRotDepth);
            tRandRotDepth = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tRandRotDepth);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, resolution, resolution, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);            

            gl.activeTexture(gl.TEXTURE0 + tiRandRotColor);
            tRandRotColor = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tRandRotColor);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution, resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            gl.activeTexture(gl.TEXTURE0 + tiRandRotNormal);
            tRandRotNormal = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tRandRotNormal);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution, resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            fbRandRot = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbRandRot);
            extDrawBuffers.drawBuffersWEBGL([
                extDrawBuffers.COLOR_ATTACHMENT0_WEBGL,
                extDrawBuffers.COLOR_ATTACHMENT1_WEBGL,
            ]);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, extDrawBuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, tRandRotColor, 0);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, extDrawBuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, tRandRotNormal, 0);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tRandRotDepth, 0);

            // fbScene
            gl.activeTexture(gl.TEXTURE0 + tiSceneColor);
            tSceneColor = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tSceneColor);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution, resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            gl.activeTexture(gl.TEXTURE0 + tiSceneNormal);
            tSceneNormal = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tSceneNormal);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution, resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            gl.activeTexture(gl.TEXTURE0 + tiSceneDepth);
            tSceneDepth = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tSceneDepth);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, resolution, resolution, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);            

            fbScene = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbScene);
            extDrawBuffers.drawBuffersWEBGL([
                extDrawBuffers.COLOR_ATTACHMENT0_WEBGL,
                extDrawBuffers.COLOR_ATTACHMENT1_WEBGL,
            ]);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, extDrawBuffers.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, tSceneColor, 0);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, extDrawBuffers.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, tSceneNormal, 0);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tSceneDepth, 0);

            // fbAccumulator
            gl.activeTexture(gl.TEXTURE0 + tiAccumulator);
            tAccumulator = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tAccumulator);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution, resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            gl.activeTexture(gl.TEXTURE0 + tiAccumulatorOut);
            tAccumulatorOut = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tAccumulatorOut);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution, resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            fbAccumulator = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbAccumulator);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tAccumulatorOut, 0);

            // fbAO
            gl.activeTexture(gl.TEXTURE0 + tiAO);
            tAO = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tAO);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution, resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            fbAO = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbAO);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tAO, 0);

        }

        self.setResolution = function(res) {
            resolution = res;
            canvas.width = canvas.height = resolution;
            gl.viewport(0,0,resolution,resolution);
            self.createTextures();
        }


        self.setAtoms = function(newAtoms, view) {

            atoms = newAtoms;

            function make36(arr) {
                var out = [];
                for (var i = 0; i < 36; i++) {
                    out.push.apply(out, arr);
                }
                return out;
            }

            // Atoms

            var attribs = {
                aImposter: {
                    buffer: new core.Buffer(gl),
                    size: 3
                },
                aPosition: {
                    buffer: new core.Buffer(gl),
                    size: 3
                },
                aRadius: {
                    buffer: new core.Buffer(gl),
                    size: 1
                },
                aColor: {
                    buffer: new core.Buffer(gl),
                    size: 3
                },
            };

            var imposter = [];
            var position = [];
            var radius = [];
            var color = [];

            for (var i = 0; i < atoms.atoms.length; i++) {
                imposter.push.apply(imposter, cube.position);
                var a = atoms.atoms[i];
                position.push.apply(position, make36([a.x, a.y, a.z]));
                radius.push.apply(radius, make36([elements[a.symbol].radius]));
                var c = elements[a.symbol].color;
                color.push.apply(color, make36([c[0], c[1], c[2]]));
            }

            attribs.aImposter.buffer.set(new Float32Array(imposter));
            attribs.aPosition.buffer.set(new Float32Array(position));
            attribs.aRadius.buffer.set(new Float32Array(radius));
            attribs.aColor.buffer.set(new Float32Array(color));

            var count = imposter.length / 9;

            rScene = new core.Renderable(gl, progScene, attribs, count);

            // Bonds

            if (view.getBonds()) {

                var bonds = [];

                for (var i = 0; i < atoms.atoms.length - 1; i++) {
                    for (var j = i + 1; j < atoms.atoms.length; j++) {
                        var a = atoms.atoms[i];
                        var b = atoms.atoms[j];
                        var l = glm.vec3.fromValues(a.x, a.y, a.z);
                        var m = glm.vec3.fromValues(b.x, b.y, b.z);
                        var cutoff = elements[a.symbol].radius + elements[b.symbol].radius;
                        if (glm.vec3.distance(l,m) > cutoff * view.getBondThreshold()) {
                            continue;
                        }
                        var ca = elements[a.symbol].color;
                        var cb = elements[b.symbol].color;
                        bonds.push({
                            a: a,
                            b: b,
                            ca: ca,
                            cb: cb
                        });
                    }
                }

                rBonds = null;

                if (bonds.length > 0) {

                    var attribs = {
                        aImposter: {
                            buffer: new core.Buffer(gl),
                            size: 3
                        },
                        aPosA: {
                            buffer: new core.Buffer(gl),
                            size: 3
                        },
                        aPosB: {
                            buffer: new core.Buffer(gl),
                            size: 3
                        },
                        aColA: {
                            buffer: new core.Buffer(gl),
                            size: 3
                        },
                        aColB: {
                            buffer: new core.Buffer(gl),
                            size: 3
                        }
                    };

                    var imposter = [];
                    var posa = [];
                    var posb = [];
                    var cola = [];
                    var colb = [];

                    for (var i = 0; i < bonds.length; i++) {
                        var b = bonds[i];
                        imposter.push.apply(imposter, cube.position);
                        posa.push.apply(posa, make36([b.a.x, b.a.y, b.a.z]));
                        posb.push.apply(posb, make36([b.b.x, b.b.y, b.b.z]));
                        cola.push.apply(cola, make36([b.ca[0], b.ca[1], b.ca[2]]));
                        colb.push.apply(colb, make36([b.cb[0], b.cb[1], b.cb[2]]));
                    }

                    attribs.aImposter.buffer.set(new Float32Array(imposter));
                    attribs.aPosA.buffer.set(new Float32Array(posa));
                    attribs.aPosB.buffer.set(new Float32Array(posb));
                    attribs.aColA.buffer.set(new Float32Array(cola));
                    attribs.aColB.buffer.set(new Float32Array(colb));

                    var count = imposter.length / 9;

                    rBonds = new core.Renderable(gl, progBonds, attribs, count);

                }

            }

        }

        self.reset = function() {
            sampleCount = 0;
            initialRender = false;
            gl.activeTexture(gl.TEXTURE0 + tiAccumulator);
            gl.bindTexture(gl.TEXTURE_2D, tAccumulator);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution, resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.activeTexture(gl.TEXTURE0 + tiAccumulatorOut);
            gl.bindTexture(gl.TEXTURE_2D, tAccumulatorOut);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution, resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }

        self.render = function(view) {
            if (atoms === undefined) {
                return;
            }
            if (rScene == null) {
                return;
            }

            range = atoms.getRadius(view.getAtomScale()) * 2.0;

            if (!initialRender) {
                scene(view);
                initialRender = true;
            } else {
                for (var i = 0; i < view.getSamplesPerFrame(); i++) {
                    if (sampleCount > 1024) {
                        break;
                    }
                    sample(view);
                    sampleCount++;
                }
            }
            display(view);
        }

        function scene(view) {
            // Render the depth/color buffers.
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbScene);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            var rect = view.getRect();
            var projection = glm.mat4.create();
            glm.mat4.ortho(projection, rect.left, rect.right, rect.bottom, rect.top, 0, range);
            var viewMat = glm.mat4.create();
            glm.mat4.lookAt(viewMat, [0, 0, 0], [0, 0, -1], [0, 1, 0]);
            var model = glm.mat4.create();
            glm.mat4.translate(model, model, [0, 0, -range/2]);
            glm.mat4.multiply(model, model, view.getRotation());
            progScene.setUniform("uProjection", "Matrix4fv", false, projection);
            progScene.setUniform("uView", "Matrix4fv", false, viewMat);
            progScene.setUniform("uModel", "Matrix4fv", false, model);
            progScene.setUniform("uBottomLeft", "2fv", [rect.left, rect.bottom]);
            progScene.setUniform("uTopRight", "2fv", [rect.right, rect.top]);
            progScene.setUniform("uAtomScale", "1f", 2.5 * view.getAtomScale());
            progScene.setUniform("uRelativeAtomScale", "1f", view.getRelativeAtomScale());
            progScene.setUniform("uRes", "1f", resolution);
            progScene.setUniform("uDepth", "1f", range);
            rScene.render();

            if (view.getBonds() && rBonds != null) {
                progBonds.setUniform("uProjection", "Matrix4fv", false, projection);
                progBonds.setUniform("uView", "Matrix4fv", false, viewMat);
                progBonds.setUniform("uModel", "Matrix4fv", false, model);
                progBonds.setUniform("uRotation", "Matrix4fv", false, view.getRotation());
                progBonds.setUniform("uDepth", "1f", range);
                progBonds.setUniform("uBottomLeft", "2fv", [rect.left, rect.bottom]);
                progBonds.setUniform("uTopRight", "2fv", [rect.right, rect.top]);
                progBonds.setUniform("uRes", "1f", resolution);
                progBonds.setUniform("uBondRadius", "1f", 2.5 * view.getBondRadius());
                rBonds.render();
            }
        }

        function sample(view) {
            var v = view.clone();
            v.setZoom(1/range);
            v.setTranslation(0, 0);
            var rot = glm.mat4.create();
            for (var i = 0; i < 3; i++) {
                var axis = glm.vec3.random(glm.vec3.create(), 1.0);
                glm.mat4.rotate(rot, rot, Math.random() * 10, axis);
            }
            v.setRotation(glm.mat4.multiply(glm.mat4.create(), rot, v.getRotation()));
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbRandRot);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            var rect = v.getRect();
            var projection = glm.mat4.create();
            glm.mat4.ortho(projection, rect.left, rect.right, rect.bottom, rect.top, 0, range);
            var viewMat = glm.mat4.create();
            glm.mat4.lookAt(viewMat, [0, 0, 0], [0, 0, -1], [0, 1, 0]);
            var model = glm.mat4.create();
            glm.mat4.translate(model, model, [0, 0, -range/2]);
            glm.mat4.multiply(model, model, v.getRotation());
            progScene.setUniform("uProjection", "Matrix4fv", false, projection);
            progScene.setUniform("uView", "Matrix4fv", false, viewMat);
            progScene.setUniform("uModel", "Matrix4fv", false, model);
            progScene.setUniform("uBottomLeft", "2fv", [rect.left, rect.bottom]);
            progScene.setUniform("uTopRight", "2fv", [rect.right, rect.top]);
            progScene.setUniform("uAtomScale", "1f", 2.5 * v.getAtomScale());
            progScene.setUniform("uRelativeAtomScale", "1f", view.getRelativeAtomScale());
            progScene.setUniform("uRes", "1f", resolution);
            progScene.setUniform("uDepth", "1f", range);
            rScene.render();

            if (view.getBonds() && rBonds != null) {
                progBonds.setUniform("uProjection", "Matrix4fv", false, projection);
                progBonds.setUniform("uView", "Matrix4fv", false, viewMat);
                progBonds.setUniform("uModel", "Matrix4fv", false, model);
                progBonds.setUniform("uRotation", "Matrix4fv", false, v.getRotation());
                progBonds.setUniform("uDepth", "1f", range);
                progBonds.setUniform("uBottomLeft", "2fv", [rect.left, rect.bottom]);
                progBonds.setUniform("uTopRight", "2fv", [rect.right, rect.top]);
                progBonds.setUniform("uRes", "1f", resolution);
                progBonds.setUniform("uBondRadius", "1f", 2.5 * view.getBondRadius());
                rBonds.render();
            }

            var sceneRect = view.getRect();
            var rotRect = v.getRect();
            var invRot = glm.mat4.invert(glm.mat4.create(), rot);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbAccumulator);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            progAccumulator.setUniform("uSceneDepth", "1i", tiSceneDepth);
            progAccumulator.setUniform("uSceneNormal", "1i", tiSceneNormal);
            progAccumulator.setUniform("uRandRotDepth", "1i", tiRandRotDepth);
            progAccumulator.setUniform("uAccumulator", "1i", tiAccumulator);
            progAccumulator.setUniform("uSceneBottomLeft", "2fv", [sceneRect.left, sceneRect.bottom]);
            progAccumulator.setUniform("uSceneTopRight", "2fv", [sceneRect.right, sceneRect.top]);
            progAccumulator.setUniform("uRotBottomLeft", "2fv", [rotRect.left, rotRect.bottom]);
            progAccumulator.setUniform("uRotTopRight", "2fv", [rotRect.right, rotRect.top]);
            progAccumulator.setUniform("uRes", "1f", resolution);
            progAccumulator.setUniform("uDepth", "1f", range);
            progAccumulator.setUniform("uRot", "Matrix4fv", false, rot);
            progAccumulator.setUniform("uInvRot", "Matrix4fv", false, invRot);
            progAccumulator.setUniform("uSampleCount", "1i", sampleCount);
            rAccumulator.render();
            gl.bindTexture(gl.TEXTURE_2D, tAccumulator);
            gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, resolution, resolution, 0);
        }

        function display(view) {
            if (view.getFXAA()) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, fbAO);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            }
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            progAO.setUniform("uSceneColor", "1i", tiSceneColor);
            progAO.setUniform("uSceneDepth", "1i", tiSceneDepth);
            progAO.setUniform("uAccumulatorOut", "1i", tiAccumulatorOut);
            progAO.setUniform("uRes", "1f", resolution);
            progAO.setUniform("uAO", "1f", 2.0 * view.getAmbientOcclusion());
            progAO.setUniform("uBrightness", "1f", 2.0 * view.getBrightness());
            progAO.setUniform("uOutlineStrength", "1f", view.getOutlineStrength());
            rAO.render();

            if (view.getFXAA()) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                progFXAA.setUniform("uTexture", "1i", tiAO);
                progFXAA.setUniform("uRes", "1f", resolution);
                rFXAA.render();
            }

            // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            // progDisplayQuad.setUniform("uTexture", "1i", tiSceneNormal);
            // progDisplayQuad.setUniform("uRes", "1f", resolution);
            // rDispQuad.render();
            // return;
        }

        self.initialize();
}


function loadProgram(gl, src) {
    src = src.split('// __split__');
    return new core.Program(gl, src[0], src[1]);
}